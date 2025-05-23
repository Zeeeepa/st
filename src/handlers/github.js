// src/handlers/github.js
import { verifyGitHubSignature } from '../utils/security.js';
import { extractGitHubMetadata } from '../utils/metadata.js';

const GITHUB_EVENT_MAPPING = {
  'pull_request': {
    opened: 'pr_opened',
    closed: 'pr_closed',
    merged: 'pr_merged',
    reopened: 'pr_reopened',
    synchronize: 'pr_updated',
    review_requested: 'pr_review_requested',
    review_request_removed: 'pr_review_request_removed',
    labeled: 'pr_labeled',
    unlabeled: 'pr_unlabeled',
    assigned: 'pr_assigned',
    unassigned: 'pr_unassigned',
    converted_to_draft: 'pr_converted_to_draft',
    ready_for_review: 'pr_ready_for_review'
  },
  'issues': {
    opened: 'issue_opened',
    closed: 'issue_closed',
    reopened: 'issue_reopened',
    edited: 'issue_edited',
    deleted: 'issue_deleted',
    transferred: 'issue_transferred',
    pinned: 'issue_pinned',
    unpinned: 'issue_unpinned',
    labeled: 'issue_labeled',
    unlabeled: 'issue_unlabeled',
    locked: 'issue_locked',
    unlocked: 'issue_unlocked',
    milestoned: 'issue_milestoned',
    demilestoned: 'issue_demilestoned',
    assigned: 'issue_assigned',
    unassigned: 'issue_unassigned'
  },
  'push': 'code_pushed',
  'release': {
    published: 'release_published',
    unpublished: 'release_unpublished',
    created: 'release_created',
    edited: 'release_edited',
    deleted: 'release_deleted',
    prereleased: 'release_prereleased',
    released: 'release_released'
  },
  'deployment': {
    created: 'deployment_created'
  },
  'deployment_status': {
    created: 'deployment_status_updated'
  },
  'workflow_run': {
    requested: 'workflow_requested',
    in_progress: 'workflow_in_progress',
    completed: 'workflow_completed'
  },
  'check_run': {
    created: 'check_created',
    rerequested: 'check_rerequested',
    completed: 'check_completed',
    requested_action: 'check_action_requested'
  },
  'check_suite': {
    completed: 'checks_completed',
    requested: 'checks_requested',
    rerequested: 'checks_rerequested'
  },
  'status': 'commit_status_updated',
  'repository': {
    created: 'repo_created',
    deleted: 'repo_deleted',
    archived: 'repo_archived',
    unarchived: 'repo_unarchived',
    edited: 'repo_edited',
    renamed: 'repo_renamed',
    transferred: 'repo_transferred',
    publicized: 'repo_made_public',
    privatized: 'repo_made_private'
  },
  'create': 'ref_created',
  'delete': 'ref_deleted',
  'fork': 'repo_forked',
  'star': {
    created: 'repo_starred',
    deleted: 'repo_unstarred'
  },
  'watch': {
    started: 'repo_watched'
  },
  'member': {
    added: 'member_added',
    removed: 'member_removed',
    edited: 'member_edited'
  },
  'team': {
    created: 'team_created',
    deleted: 'team_deleted',
    edited: 'team_edited',
    added_to_repository: 'team_added_to_repo',
    removed_from_repository: 'team_removed_from_repo'
  },
  'organization': {
    member_added: 'org_member_added',
    member_removed: 'org_member_removed',
    member_invited: 'org_member_invited'
  },
  'project': {
    created: 'project_created',
    edited: 'project_edited',
    closed: 'project_closed',
    reopened: 'project_reopened',
    deleted: 'project_deleted'
  },
  'project_card': {
    created: 'project_card_created',
    edited: 'project_card_edited',
    moved: 'project_card_moved',
    converted: 'project_card_converted',
    deleted: 'project_card_deleted'
  },
  'project_column': {
    created: 'project_column_created',
    edited: 'project_column_edited',
    moved: 'project_column_moved',
    deleted: 'project_column_deleted'
  },
  'milestone': {
    created: 'milestone_created',
    closed: 'milestone_closed',
    opened: 'milestone_opened',
    edited: 'milestone_edited',
    deleted: 'milestone_deleted'
  },
  'package': {
    published: 'package_published',
    updated: 'package_updated'
  },
  'page_build': 'pages_built',
  'ping': 'webhook_ping',
  'public': 'repo_made_public',
  'sponsorship': {
    created: 'sponsorship_created',
    cancelled: 'sponsorship_cancelled',
    edited: 'sponsorship_edited',
    tier_changed: 'sponsorship_tier_changed',
    pending_cancellation: 'sponsorship_pending_cancellation',
    pending_tier_change: 'sponsorship_pending_tier_change'
  },
  'repository_dispatch': 'custom_event_triggered',
  'workflow_dispatch': 'workflow_manually_triggered',
  'discussion': {
    created: 'discussion_created',
    edited: 'discussion_edited',
    deleted: 'discussion_deleted',
    transferred: 'discussion_transferred',
    pinned: 'discussion_pinned',
    unpinned: 'discussion_unpinned',
    labeled: 'discussion_labeled',
    unlabeled: 'discussion_unlabeled',
    locked: 'discussion_locked',
    unlocked: 'discussion_unlocked',
    category_changed: 'discussion_category_changed',
    answered: 'discussion_answered',
    unanswered: 'discussion_unanswered'
  },
  'discussion_comment': {
    created: 'discussion_comment_created',
    edited: 'discussion_comment_edited',
    deleted: 'discussion_comment_deleted'
  },
  'commit_comment': {
    created: 'commit_commented'
  },
  'issue_comment': {
    created: 'issue_commented',
    edited: 'issue_comment_edited',
    deleted: 'issue_comment_deleted'
  },
  'pull_request_review': {
    submitted: 'pr_review_submitted',
    edited: 'pr_review_edited',
    dismissed: 'pr_review_dismissed'
  },
  'pull_request_review_comment': {
    created: 'pr_review_comment_created',
    edited: 'pr_review_comment_edited',
    deleted: 'pr_review_comment_deleted'
  },
  'pull_request_review_thread': {
    resolved: 'pr_review_thread_resolved',
    unresolved: 'pr_review_thread_unresolved'
  },
  'gollum': 'wiki_page_updated',
  'installation': {
    created: 'app_installed',
    deleted: 'app_uninstalled',
    suspend: 'app_suspended',
    unsuspend: 'app_unsuspended',
    new_permissions_accepted: 'app_permissions_accepted'
  },
  'installation_repositories': {
    added: 'app_repos_added',
    removed: 'app_repos_removed'
  },
  'marketplace_purchase': {
    purchased: 'marketplace_purchased',
    pending_change: 'marketplace_pending_change',
    pending_change_cancelled: 'marketplace_change_cancelled',
    changed: 'marketplace_changed',
    cancelled: 'marketplace_cancelled'
  },
  'meta': 'webhook_deleted',
  'security_advisory': {
    published: 'security_advisory_published',
    updated: 'security_advisory_updated',
    performed: 'security_advisory_performed',
    withdrawn: 'security_advisory_withdrawn'
  },
  'code_scanning_alert': {
    created: 'security_alert_created',
    reopened: 'security_alert_reopened',
    closed: 'security_alert_closed',
    fixed: 'security_alert_fixed',
    appeared_in_branch: 'security_alert_appeared',
    closed_by_user: 'security_alert_dismissed'
  },
  'secret_scanning_alert': {
    created: 'secret_detected',
    resolved: 'secret_resolved',
    reopened: 'secret_reopened'
  },
  'dependabot_alert': {
    created: 'dependency_alert_created',
    dismissed: 'dependency_alert_dismissed',
    fixed: 'dependency_alert_fixed',
    reintroduced: 'dependency_alert_reintroduced'
  },
  'dependency_graph': {
    updated: 'dependencies_updated'
  },
  'merge_queue_entry': {
    created: 'merge_queue_entry_added',
    deleted: 'merge_queue_entry_removed'
  },
  'branch_protection_rule': {
    created: 'branch_protection_created',
    edited: 'branch_protection_edited',
    deleted: 'branch_protection_deleted'
  },
  'repository_vulnerability_alert': {
    create: 'vulnerability_alert_created',
    dismiss: 'vulnerability_alert_dismissed',
    resolve: 'vulnerability_alert_resolved'
  }
};

export async function handleGitHubEvent(rawBody, payload, headers, config) {
  const eventType = headers['x-github-event'] || 'unknown';
  const signature = headers['x-hub-signature-256'];
  const deliveryId = headers['x-github-delivery'];
  const hookId = headers['x-github-hook-id'];
  const hookInstallationTargetId = headers['x-github-hook-installation-target-id'];
  const hookInstallationTargetType = headers['x-github-hook-installation-target-type'];
  
  // Verify signature if secret is configured
  if (config.githubWebhookSecret && signature) {
    const isValid = await verifyGitHubSignature(
      rawBody, 
      signature,
      config.githubWebhookSecret
    );
    
    if (!isValid) {
      return {
        isValid: false,
        error: 'Invalid GitHub signature'
      };
    }
  }
  
  // Extract comprehensive metadata
  const metadata = extractGitHubMetadata(payload, eventType);
  
  // Extract repository and actor
  let repository = null;
  let repositoryId = null;
  let organization = null;
  let actor = null;
  let actorId = null;
  let actorType = null;
  
  if (payload.repository) {
    repository = payload.repository.full_name;
    repositoryId = payload.repository.id;
    if (payload.repository.owner) {
      organization = payload.repository.owner.login;
    }
  }
  
  if (payload.sender) {
    actor = payload.sender.login;
    actorId = payload.sender.id;
    actorType = payload.sender.type;
  } else if (payload.actor) {
    actor = payload.actor.login;
    actorId = payload.actor.id;
    actorType = payload.actor.type;
  }
  
  // Determine specific event type
  let specificEventType = eventType;
  
  if (GITHUB_EVENT_MAPPING[eventType]) {
    if (typeof GITHUB_EVENT_MAPPING[eventType] === 'string') {
      specificEventType = GITHUB_EVENT_MAPPING[eventType];
    } else if (payload.action && GITHUB_EVENT_MAPPING[eventType][payload.action]) {
      specificEventType = GITHUB_EVENT_MAPPING[eventType][payload.action];
    }
  }
  
  // Extract additional context based on event type
  let additionalContext = {};
  
  if (eventType === 'push') {
    additionalContext = {
      ref: payload.ref,
      before: payload.before,
      after: payload.after,
      created: payload.created,
      deleted: payload.deleted,
      forced: payload.forced,
      compare: payload.compare,
      commits: payload.commits?.length || 0,
      head_commit: payload.head_commit?.id,
      pusher: payload.pusher?.name || payload.pusher?.email
    };
  } else if (eventType === 'pull_request') {
    additionalContext = {
      pr_number: payload.pull_request?.number,
      pr_title: payload.pull_request?.title,
      pr_state: payload.pull_request?.state,
      pr_merged: payload.pull_request?.merged,
      pr_draft: payload.pull_request?.draft,
      pr_base: payload.pull_request?.base?.ref,
      pr_head: payload.pull_request?.head?.ref,
      pr_author: payload.pull_request?.user?.login,
      pr_labels: payload.pull_request?.labels?.map(l => l.name) || [],
      pr_assignees: payload.pull_request?.assignees?.map(a => a.login) || [],
      pr_reviewers: payload.pull_request?.requested_reviewers?.map(r => r.login) || [],
      pr_teams: payload.pull_request?.requested_teams?.map(t => t.name) || []
    };
  } else if (eventType === 'issues') {
    additionalContext = {
      issue_number: payload.issue?.number,
      issue_title: payload.issue?.title,
      issue_state: payload.issue?.state,
      issue_labels: payload.issue?.labels?.map(l => l.name) || [],
      issue_assignees: payload.issue?.assignees?.map(a => a.login) || [],
      issue_author: payload.issue?.user?.login,
      issue_milestone: payload.issue?.milestone?.title
    };
  } else if (eventType === 'release') {
    additionalContext = {
      release_tag: payload.release?.tag_name,
      release_name: payload.release?.name,
      release_draft: payload.release?.draft,
      release_prerelease: payload.release?.prerelease,
      release_author: payload.release?.author?.login,
      release_assets: payload.release?.assets?.length || 0
    };
  } else if (eventType === 'workflow_run') {
    additionalContext = {
      workflow_id: payload.workflow_run?.workflow_id,
      workflow_name: payload.workflow_run?.name,
      workflow_run_id: payload.workflow_run?.id,
      workflow_run_number: payload.workflow_run?.run_number,
      workflow_status: payload.workflow_run?.status,
      workflow_conclusion: payload.workflow_run?.conclusion,
      workflow_branch: payload.workflow_run?.head_branch,
      workflow_actor: payload.workflow_run?.actor?.login,
      workflow_event: payload.workflow_run?.event
    };
  } else if (eventType === 'deployment' || eventType === 'deployment_status') {
    additionalContext = {
      deployment_id: payload.deployment?.id || payload.deployment_status?.deployment?.id,
      deployment_environment: payload.deployment?.environment || payload.deployment_status?.environment,
      deployment_ref: payload.deployment?.ref,
      deployment_task: payload.deployment?.task,
      deployment_description: payload.deployment?.description || payload.deployment_status?.description,
      deployment_status: payload.deployment_status?.state,
      deployment_creator: payload.deployment?.creator?.login || payload.deployment_status?.creator?.login
    };
  }
  
  return {
    isValid: true,
    eventType: specificEventType,
    repository,
    repositoryId,
    organization,
    actor,
    actorId,
    actorType,
    deliveryId,
    hookId,
    hookInstallationTargetId,
    hookInstallationTargetType,
    metadata,
    additionalContext,
    rawEventType: eventType,
    action: payload.action
  };
}