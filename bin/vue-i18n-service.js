#!/usr/bin/env node
const glob = require("glob-promise");
const fs = require("fs");
const yaml = require("yaml");
const compiler = require("vue-template-compiler");

async function runImport() {
  const translationFiles = await glob("translations/*.yml");
  const projectTranslations = getProjectTranslations(translationFiles);

  console.log('\r\nWriting files:')
  Object.keys(projectTranslations).forEach(file => {
    if (/.*\.vue$/.test(file)) {
      processVueFiles(file, projectTranslations[file]);
      console.log(file)
    }
    if (/.*\.lang\.yml$/.test(file)) {
      processYmlFiles(file, projectTranslations[file]);
      console.log(file)
    }
  });
  process.exit(0);
}

function replaceBetween(str, start, end, what) {
  return str.substring(0, start) + what + str.substring(end);
}

function getProjectTranslations(translationFiles) {
  const translations = {};
  console.log('Importing files:')
  translationFiles.forEach(file => {
    console.log(file)
    const contents = fs.readFileSync(file).toString();
    const parsedContents = yaml.parse(contents);
    const lang = file.split(".")[1];
    Object.keys(parsedContents).forEach(file => {
      if (!translations[file]) translations[file] = {};
      translations[file][lang] = parsedContents[file];
    });
  });
  return translations;
}

function processVueFiles(file, translations) {
  const sfcContent = fs.readFileSync(file).toString();
  const component = compiler.parseComponent(sfcContent);
  component.customBlocks.forEach(block => {
    if (block.type === "i18n" && Object.keys(block.attrs).length === 0) {
      fs.writeFileSync(
        file,
        replaceBetween(
          sfcContent,
          block.start,
          block.end,
          `\n${yaml.stringify(translations)}`
        )
      );
    }
  });
}

function processYmlFiles(file, translations) {
  fs.writeFileSync(file, yaml.stringify(translations));
}

async function runExport() {
  const byFile = {};

  console.log('Exporting files:');
  await addVueFiles(byFile);
  await addYmlFiles(byFile);

  const byLanguage = convertToByLanguage(byFile);
 
  console.log('\r\nWriting files:');
  writeToFileByLanguage(byLanguage);
}

async function addVueFiles(byFile) {
  const components = await glob("src/**/*.vue");

  components.forEach(file => {
    console.log(file)
    const componentAst = compiler.parseComponent(
      fs.readFileSync(file).toString()
    );
    componentAst.customBlocks
      .filter(block => block.type === "i18n")
      .forEach(block => {
        byFile[file] = yaml.parse(block.content);
      });
  });
}

async function addYmlFiles(byFile) {
  const globalLangFiles = await glob("src/**/*.lang.yml");
  globalLangFiles.forEach(file => {
    console.log(file)
    byFile[file] = yaml.parse(fs.readFileSync(file).toString());
  });
}

function convertToByLanguage(byFile) {
  const byLanguage = {};
  Object.keys(byFile).map(file => {
    Object.keys(byFile[file]).map(lang => {
      if (!byLanguage[lang]) byLanguage[lang] = {};
      byLanguage[lang][file] = byFile[file][lang];
    });
  });
  return byLanguage
}

function writeToFileByLanguage(byLanguage) {
  Object.keys(byLanguage).forEach(lang => {
    const filename = `translations/translations.${lang}.yml`;
    console.log(filename)
    fs.writeFileSync(filename, yaml.stringify(byLanguage[lang]));
  });
}

async function runCheck() {
  const errors = []
  const fromProject = {}
  console.log('Checking files:')
  await addVueFiles(fromProject)
  await addYmlFiles(fromProject)
  const languages = getAllLanguages(fromProject)
  Object.keys(fromProject).forEach(file => {
    const translatedLanguages = Object.keys(fromProject[file]);
    const translationsInFile = fromProject[file];
    languages.forEach(lang => {
      if(translatedLanguages.indexOf(lang) === -1) errors.push(`Missing ${lang} translations in ${file} file.`);
      // console.error(`\x1b[31mMissing ${lang} translations in ${file} file.\x1b[0m`)
    })
    const translatedKeysInFile = getTranslatedKeysInFile(translatedLanguages, translationsInFile)

    translatedLanguages.forEach(language => {
      const translatedKeys = Object.keys(fromProject[file][language]);
      translatedKeysInFile.forEach(translatedKeyInFile => {
        if(translatedKeys.indexOf(translatedKeyInFile) === -1) errors.push(`Missing translation for ${translatedKeyInFile} in ${language} language in ${file} file.`)
      })
    })
  })
  if(errors.length > 0) {
    errors.forEach(error => {
      console.error(`\x1b[31m${error}\x1b[0m`)
    })
    process.exit(1);
  }
  process.exit(0);
}

function getAllLanguages(fromProject) {
  const languages = []
  Object.keys(fromProject).forEach(file => {
    Object.keys(fromProject[file]).forEach(lang => {
      if(languages.indexOf(lang) === -1) languages.push(lang)
    })
  })
  return languages
}

function getTranslatedKeysInFile(translatedLanguages, translationsInFile) {
  const translatedKeysInFile = []
  translatedLanguages.forEach(language => {
    const translatedKeys = Object.keys(translationsInFile[language]);
    translatedKeys.map(translatedKey => {
      if(translatedKeysInFile.indexOf(translatedKey) === -1) translatedKeysInFile.push(translatedKey);
    })
  })
  return translatedKeysInFile
}

switch (process.argv[2]) {
  case "import":
    runImport();
    break;
  case "export":
    runExport();
    break;
  case "check":
    runCheck();
    break;
  default:
    console.log("vue-i18n-services v" + require("../package.json").version);
    console.log("commands:");
    console.log("   vue-i18n-services export");
    console.log(
      "     Collects all the <i18n> tags in SCF .vue files and YAML files, then exports them to YAML files by language\n"
    );
    console.log("   vue-i18n-services import");
    console.log(
      "     Distributes all the changes from YAML files by language to the related components and YAML files\n"
    );
}
