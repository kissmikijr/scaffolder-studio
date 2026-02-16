import { PublisherExtension, PublishContext } from './types';
import { ScmIntegrations } from '@backstage/integration';
import { Octokit } from 'octokit';

export class GithubPublisher implements PublisherExtension {
  readonly id = 'github-publisher';
  readonly title = 'Publish to GitHub';

  constructor(private readonly integrations: ScmIntegrations) { }

  async publish({
    scaffolderTemplate,
    options,
    user,
  }: PublishContext): Promise<void> {
    const repositoryUrl = options?.repositoryUrl as string;
    if (!repositoryUrl) {
      throw new Error('Repository URL is required for SCM publishing');
    }

    const integration = this.integrations.byUrl(repositoryUrl);
    if (!integration) {
      throw new Error(`No integration found for ${repositoryUrl}`);
    }

    if (integration.type !== 'github') {
      throw new Error(
        `Only GitHub is supported for now. Found: ${integration.type}`,
      );
    }

    const { owner, repo } = this.parseRepoUrl(repositoryUrl);
    const token = (integration as any).config.token;

    if (!token) {
      throw new Error(
        `No token found for ${repositoryUrl}. Please configure a token in app-config.yaml.`,
      );
    }

    const octokit = new Octokit({ auth: token });

    // 1. Get default branch
    const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
    const defaultBranch = repoData.default_branch;
    const { data: refData } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${defaultBranch}`,
    });
    const defaultBranchSha = refData.object.sha;

    // 2. Create a new branch
    const branchName = `scaffolder-publish-${Date.now()}`;
    await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: defaultBranchSha,
    });

    // 3. Create blob
    const { data: blobData } = await octokit.rest.git.createBlob({
      owner,
      repo,
      content: scaffolderTemplate,
      encoding: 'utf-8',
    });

    // 4. Create tree
    const { data: treeData } = await octokit.rest.git.createTree({
      owner,
      repo,
      base_tree: defaultBranchSha,
      tree: [
        {
          path: 'template.yaml', // Default filename
          mode: '100644',
          type: 'blob',
          sha: blobData.sha,
        },
      ],
    });

    // 5. Create commit
    const { data: commitData } = await octokit.rest.git.createCommit({
      owner,
      repo,
      message: `Add template.yaml via Scaffolder Visual Editor\n\nPublished by ${user}`,
      tree: treeData.sha,
      parents: [defaultBranchSha],
    });

    // 6. Update reference
    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${branchName}`,
      sha: commitData.sha,
    });

    // 7. Create Pull Request
    await octokit.rest.pulls.create({
      owner,
      repo,
      title: 'Add template.yaml',
      body: `This PR adds a new template created with the Scaffolder Visual Editor.\n\nPublished by: ${user}`,
      head: branchName,
      base: defaultBranch,
    });

  }

  private parseRepoUrl(url: string): { owner: string; repo: string } {
    try {
      const urlObj = new URL(url);
      const parts = urlObj.pathname.split('/').filter(Boolean);
      if (parts.length < 2) {
        throw new Error('Invalid GitHub URL');
      }
      return { owner: parts[0], repo: parts[1] };
    } catch (e) {
      throw new Error(`Failed to parse repository URL: ${url}`);
    }
  }
}
