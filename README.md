# Upload files to a GitHub release

This action allows you to select which files to upload to the just-tagged release.
It runs on all operating systems types offered by GitHub.

## Input variables

You must provide:

- `token`: GitHub token for uploading assets to releases, defaults to using secrets.GITHUB_TOKEN
- `file`: A local file to be uploaded as the asset.
- `tag`: The tag to upload into. If you want the current event's tag or branch name, use `${{ github.ref }}` (the `refs/tags/` and `refs/heads/` prefixes will be automatically stripped).

Optional Arguments

- `asset_name`: The name the file gets as an asset on a release.
- `overwrite`: If an asset with the same name already exists, overwrite it (Default: `false`).
- `repo_name`: Specify the name of the GitHub repository in which the GitHub release will be created, edited, and deleted. If the repository is other than the current, it is required to create a personal access token with `repo`, `user`, `admin:repo_hook` scopes to the foreign repository and add it as a secret. (Default: current repository).

## Output variables

- `browser_download_url`: The publicly available URL of the asset.

## Usage

This usage assumes you want to build on tag creations only.
This is a common use case as you will want to upload release binaries for your tags.

Simple example:

```yaml
name: Publish

on:
  push:
    tags:
      - '*'

jobs:
  build:
    name: Publish binaries
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2
    - name: Build
      run: cargo build --release
    - name: Upload binaries to release
      uses: svenstaro/upload-release-action@v2
      with:
        token: ${{ secrets.GITHUB_TOKEN }}
        file: target/release/mything
        asset_name: mything
        tag: ${{ github.ref }}
        overwrite: true
```

Complex example with more operating systems:

```yaml
name: Publish

on:
  push:
    tags:
      - '*'

jobs:
  publish:
    name: Publish for ${{ matrix.os }}
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        include:
          - os: ubuntu-latest
            artifact_name: mything
            asset_name: mything-linux-amd64
          - os: windows-latest
            artifact_name: mything.exe
            asset_name: mything-windows-amd64
          - os: macos-latest
            artifact_name: mything
            asset_name: mything-macos-amd64

    steps:
    - uses: actions/checkout@v2
    - name: Build
      run: cargo build --release --locked
    - name: Upload binaries to release
      uses: svenstaro/upload-release-action@v2
      with:
        token: ${{ secrets.GITHUB_TOKEN }}
        file: target/release/${{ matrix.artifact_name }}
        asset_name: ${{ matrix.asset_name }}
        tag: ${{ github.ref }}
```

Example for creating a release in a foreign repository using `repo_name`:

```yaml
name: Publish

on:
  push:
    tags:
      - '*'

jobs:
  build:
    name: Publish binaries
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2
    - name: Build
      run: cargo build --release
    - name: Upload binaries to release
      uses: svenstaro/upload-release-action@v2
      with:
        repo_name: owner/repository-name
        # A personal access token for the GitHub repository in which the release will be created and edited.
        # It is recommended to create the access token with the following scopes: `repo, user, admin:repo_hook`.
        token: ${{ secrets.YOUR_PERSONAL_ACCESS_TOKEN }}
        file: target/release/mything
        asset_name: mything
        tag: ${{ github.ref }}
        overwrite: true
```


## Releasing

To release this Action:

- `yarn build`
- `yarn version --message "chore: Release %s"`
- `git push --follow-tags`
