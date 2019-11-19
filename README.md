# vue-i18n-service

This fork is rewritten to export translations from Vue SFCs and YAML files to separate YAML files by language.

## What's the flow:
`Hello.vue`
```vue
<template>
  <div>{{ hello }}</div>
</template>

<i18n>
en:
  hello: Hi 🙁
tr:
  hello: Selam
</i18n>
```

⬇️`npx vue-i18n-service export`
`translations.en.yml`
```yml
en:
  hello: Hi 🙁
```

`translations.en.yml`
```yml
tr:
  hello: Selam
```


### Editing translations using Web UI

Web editting is remove from this fork

## Exporting i18n's in SFCs

This will generate a `translations.<locale>.yml` files for each language in the project.

```bash
npx vue-i18n-service export
```

It has a simple format:

```yml
<file path>:
    <locale>:
      <key>: <value>
```

Here is an example:

```yml
src/components/Hello.vue:
  en:
    hello: Hello
  tr:
    hello: Merhaba
src/views/World.vue:
  en: 
    world: World
  tr:
    world: Dünya
```

## Importing `translations.json` file to the SFCs

After bulk changing files, you can distribute import all the files calling `import` command.

```bash
npx vue-i18n-service import
```

This will update `.vue` and `.lang.yml` files in the project and replace them with changes.

## Checking files for missing translations

You can use this command to check for miising translations:

```bash
npx vue-i18n-service check
```

## License

MIT.
