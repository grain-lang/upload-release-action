import * as fs from "fs";
import {Endpoints} from "@octokit/types";
import * as core from "@actions/core";
import * as github from "@actions/github";

type RepoAssetsResp =
  Endpoints["GET /repos/{owner}/{repo}/releases/{release_id}/assets"]["response"]["data"];
type ReleaseByTagResp = Endpoints["GET /repos/{owner}/{repo}/releases/tags/{tag}"]["response"];
type UploadAssetResp =
  Endpoints["POST {origin}/repos/{owner}/{repo}/releases/{release_id}/assets{?name,label}"]["response"];

async function get_release_by_tag(token: string, tag: string): Promise<ReleaseByTagResp> {
  const octokit = github.getOctokit(token);
  core.debug(`Getting release by tag ${tag}.`);
  return await octokit.rest.repos.getReleaseByTag({
    ...repo(),
    tag: tag,
  });
}

async function upload_to_release(
  token: string,
  release: ReleaseByTagResp,
  file: string,
  asset_name: string,
  tag: string,
  overwrite: boolean,
): Promise<undefined | string> {
  const octokit = github.getOctokit(token);

  const stat = fs.statSync(file);
  if (!stat.isFile()) {
    core.debug(`Skipping ${file}, since its not a file`);
    return;
  }
  const file_size = stat.size;
  const file_bytes = fs.readFileSync(file);

  // Check for duplicates.
  const assets: RepoAssetsResp = await octokit.paginate(octokit.rest.repos.listReleaseAssets, {
    ...repo(),
    release_id: release.data.id,
  });
  const duplicate_asset = assets.find(a => a.name === asset_name);
  if (duplicate_asset !== undefined) {
    if (overwrite) {
      core.debug(
        `An asset called ${asset_name} already exists in release ${tag} so we'll overwrite it.`,
      );
      await octokit.rest.repos.deleteReleaseAsset({
        ...repo(),
        asset_id: duplicate_asset.id,
      });
    } else {
      core.setFailed(`An asset called ${asset_name} already exists.`);
      return duplicate_asset.browser_download_url;
    }
  } else {
    core.debug(`No pre-existing asset called ${asset_name} found in release ${tag}. All good.`);
  }

  core.debug(`Uploading ${file} to ${asset_name} in release ${tag}.`);
  const uploaded_asset: UploadAssetResp = await octokit.rest.repos.uploadReleaseAsset({
    url: release.data.upload_url,
    name: asset_name,
    // @ts-ignore
    data: file_bytes,
    headers: {
      "content-type": "binary/octet-stream",
      "content-length": file_size,
    },
  });
  return uploaded_asset.data.browser_download_url;
}

function repo(): {owner: string; repo: string} {
  const repo_name = core.getInput("repo_name");
  // If we're not targeting a foreign repository, we can just return immediately and don't have to do extra work.
  if (!repo_name) {
    return github.context.repo;
  }
  const [owner, repository] = repo_name.split("/");
  if (!owner) {
    throw new Error(`Could not extract 'owner' from 'repo_name': ${repo_name}.`);
  }
  if (!repository) {
    throw new Error(`Could not extract 'repo' from 'repo_name': ${repo_name}.`);
  }
  return {
    owner,
    repo: repository,
  };
}

async function run(): Promise<void> {
  try {
    // Get the inputs from the workflow file: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
    const token = core.getInput("token", {required: true});
    const file = core.getInput("file", {required: true});
    const tag = core
      .getInput("tag", {required: true})
      .replace("refs/tags/", "")
      .replace("refs/heads/", "");
    const asset_name = core.getInput("asset_name", {required: true});
    const overwrite = core.getInput("overwrite") == "true" ? true : false;

    const release = await get_release_by_tag(token, tag);
    core.setOutput("notes", release.data.body);

    const asset_download_url = await upload_to_release(
      token,
      release,
      file,
      asset_name,
      tag,
      overwrite,
    );
    core.setOutput("browser_download_url", asset_download_url);
  } catch (error) {
    core.setFailed((<Error>error).message);
  }
}

run();
