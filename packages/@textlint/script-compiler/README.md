# @textlint/script-compiler

textlint compiler tool

## Install

Install with [npm](https://www.npmjs.com/):

    npm install @textlint/script-compiler

## Usage

    Usage
      $ textlint-script-compiler 
 
    Options
      --cwd                       [path:String] current working directory
      --textlintrc                [path:String] path to .textlintrc file.
                                  Default: .textlintrc.{json,yaml,js}
      --output-dir                [path:String] output file path that is written of reported result.
      --mode                      [String] build mode: "production" or "development"
      --metadataName              [String] generated script name
      --metadataNamespace         [String] generated script namespace
 
    Examples
      $ textlint-script-compiler --output-dir ./dist --metadataName "test" --metadataNamespace "https://example.com"

## Demo

    yarn run compile:textlint
    yarn dev

## Changelog

See [Releases page](https://github.com/textlint/editor/releases).

## Running tests

Install devDependencies and Run `npm test`:

    npm test

## Contributing

Pull requests and stars are always welcome.

For bugs and feature requests, [please create an issue](https://github.com/textlint/editor/issues).

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## Author

- [github/azu](https://github.com/azu)
- [twitter/azu_re](https://twitter.com/azu_re)

## License

MIT © azu