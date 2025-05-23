// src/utils/metadata.js

/**
 * Extract comprehensive metadata from GitHub payloads
 */
export function extractGitHubMetadata(payload, eventType) {
  const metadata = {
    eventType,
    timestamp: new Date().toISOString(),
    source: 'github'
  };
  
  // Repository metadata
  if (payload.repository) {
    metadata.repository = {
      id: payload.repository.id,
      name: payload.repository.name,
      full_name: payload.repository.full_name,
      private: payload.repository.private,
      owner: {
        login: payload.repository.owner?.login,
        id: payload.repository.owner?.id,
        type: payload.repository.owner?.type
      },
      html_url: payload.repository.html_url,
      description: payload.repository.description,
      fork: payload.repository.fork,
      created_at: payload.repository.created_at,
      updated_at: payload.repository.updated_at,
      pushed_at: payload.repository.pushed_at,
      size: payload.repository.size,
      stargazers_count: payload.repository.stargazers_count,
      watchers_count: payload.repository.watchers_count,
      language: payload.repository.language,
      has_issues: payload.repository.has_issues,
      has_projects: payload.repository.has_projects,
      has_downloads: payload.repository.has_downloads,
      has_wiki: payload.repository.has_wiki,
      has_pages: payload.repository.has_pages,
      forks_count: payload.repository.forks_count,
      archived: payload.repository.archived,
      disabled: payload.repository.disabled,
      open_issues_count: payload.repository.open_issues_count,
      license: payload.repository.license?.name,
      topics: payload.repository.topics,
      visibility: payload.repository.visibility,
      default_branch: payload.repository.default_branch
    };
  }
  
  // Organization metadata
  if (payload.organization) {
    metadata.organization = {
      login: payload.organization.login,
      id: payload.organization.id,
      url: payload.organization.url,
      avatar_url: payload.organization.avatar_url,
      description: payload.organization.description
    };
  }
  
  // Sender metadata
  if (payload.sender) {
    metadata.sender = {
      login: payload.sender.login,
      id: payload.sender.id,
      avatar_url: payload.sender.avatar_url,
      type: payload.sender.type,
      site_admin: payload.sender.site_admin
    };
  }
  
  // Installation metadata (for GitHub Apps)
  if (payload.installation) {
    metadata.installation = {
      id: payload.installation.id,
      account: {
        login: payload.installation.account?.login,
        id: payload.installation.account?.id,
        type: payload.installation.account?.type
      }
    };
  }
  
  // Extract event-specific metadata
  switch (eventType) {
    case 'push':
      if (payload.ref) {
        metadata.push = {
          ref: payload.ref,
          before: payload.before,
          after: payload.after,
          created: payload.created,
          deleted: payload.deleted,
          forced: payload.forced,
          base_ref: payload.base_ref,
          compare: payload.compare,
          commits_count: payload.commits?.length || 0,
          distinct_commits_count: payload.distinct_commits?.length || 0,
          head_commit_id: payload.head_commit?.id,
          head_commit_message: payload.head_commit?.message,
          head_commit_author: payload.head_commit?.author
        };
      }
      break;
      
    case 'pull_request':
      if (payload.pull_request) {
        metadata.pull_request = {
          id: payload.pull_request.id,
          number: payload.pull_request.number,
          state: payload.pull_request.state,
          locked: payload.pull_request.locked,
          title: payload.pull_request.title,
          body: payload.pull_request.body,
          created_at: payload.pull_request.created_at,
          updated_at: payload.pull_request.updated_at,
          closed_at: payload.pull_request.closed_at,
          merged_at: payload.pull_request.merged_at,
          merge_commit_sha: payload.pull_request.merge_commit_sha,
          assignees: payload.pull_request.assignees?.map(a => a.login),
          requested_reviewers: payload.pull_request.requested_reviewers?.map(r => r.login),
          requested_teams: payload.pull_request.requested_teams?.map(t => t.name),
          labels: payload.pull_request.labels?.map(l => l.name),
          milestone: payload.pull_request.milestone?.title,
          draft: payload.pull_request.draft,
          commits: payload.pull_request.commits,
          additions: payload.pull_request.additions,
          deletions: payload.pull_request.deletions,
          changed_files: payload.pull_request.changed_files,
          base: payload.pull_request.base ? {
            ref: payload.pull_request.base.ref,
            sha: payload.pull_request.base.sha
          } : null,
          head: payload.pull_request.head ? {
            ref: payload.pull_request.head.ref,
            sha: payload.pull_request.head.sha
          } : null
        };
      }
      break;
      
    case 'issues':
      if (payload.issue) {
        metadata.issue = {
          id: payload.issue.id,
          number: payload.issue.number,
          state: payload.issue.state,
          title: payload.issue.title,
          body: payload.issue.body,
          created_at: payload.issue.created_at,
          updated_at: payload.issue.updated_at,
          closed_at: payload.issue.closed_at,
          assignees: payload.issue.assignees?.map(a => a.login),
          labels: payload.issue.labels?.map(l => l.name),
          milestone: payload.issue.milestone?.title,
          locked: payload.issue.locked,
          comments: payload.issue.comments,
          author_association: payload.issue.author_association
        };
      }
      break;
      
    case 'release':
      if (payload.release) {
        metadata.release = {
          id: payload.release.id,
          tag_name: payload.release.tag_name,
          target_commitish: payload.release.target_commitish,
          name: payload.release.name,
          draft: payload.release.draft,
          prerelease: payload.release.prerelease,
          created_at: payload.release.created_at,
          published_at: payload.release.published_at,
          assets: payload.release.assets?.map(a => ({
            name: a.name,
            size: a.size,
            download_count: a.download_count
          }))
        };
      }
      break;
      
    case 'workflow_run':
      if (payload.workflow_run) {
        metadata.workflow_run = {
          id: payload.workflow_run.id,
          name: payload.workflow_run.name,
          head_branch: payload.workflow_run.head_branch,
          head_sha: payload.workflow_run.head_sha,
          status: payload.workflow_run.status,
          conclusion: payload.workflow_run.conclusion,
          workflow_id: payload.workflow_run.workflow_id,
          run_number: payload.workflow_run.run_number,
          event: payload.workflow_run.event,
          created_at: payload.workflow_run.created_at,
          updated_at: payload.workflow_run.updated_at,
          run_attempt: payload.workflow_run.run_attempt
        };
      }
      break;
  }
  
  return metadata;
}

/**
 * Extract comprehensive metadata from Linear payloads
 */
export function extractLinearMetadata(payload) {
  const metadata = {
    timestamp: new Date().toISOString(),
    source: 'linear',
    action: payload.action,
    type: payload.type,
    organizationId: payload.organizationId,
    webhookId: payload.webhookId,
    webhookTimestamp: payload.createdAt
  };
  
  if (payload.data) {
    // Common fields
    metadata.data = {
      id: payload.data.id,
      createdAt: payload.data.createdAt,
      updatedAt: payload.data.updatedAt,
      archivedAt: payload.data.archivedAt
    };
    
    // Type-specific metadata
    switch (payload.type) {
      case 'Issue':
        Object.assign(metadata.data, {
          identifier: payload.data.identifier,
          title: payload.data.title,
          description: payload.data.description,
          priority: payload.data.priority,
          priorityLabel: payload.data.priorityLabel,
          estimate: payload.data.estimate,
          dueDate: payload.data.dueDate,
          completedAt: payload.data.completedAt,
          canceledAt: payload.data.canceledAt,
          startedAt: payload.data.startedAt,
          number: payload.data.number,
          url: payload.data.url,
          branchName: payload.data.branchName,
          customerTicketCount: payload.data.customerTicketCount,
          previousIdentifiers: payload.data.previousIdentifiers,
          subIssueSortOrder: payload.data.subIssueSortOrder,
          sortOrder: payload.data.sortOrder
        });
        
        // Related entities
        if (payload.data.state) {
          metadata.data.state = {
            id: payload.data.state.id,
            name: payload.data.state.name,
            type: payload.data.state.type,
            color: payload.data.state.color
          };
        }
        
        if (payload.data.team) {
          metadata.data.team = {
            id: payload.data.team.id,
            name: payload.data.team.name,
            key: payload.data.team.key
          };
        }
        
        if (payload.data.assignee) {
          metadata.data.assignee = {
            id: payload.data.assignee.id,
            name: payload.data.assignee.name,
            email: payload.data.assignee.email
          };
        }
        
        if (payload.data.creator) {
          metadata.data.creator = {
            id: payload.data.creator.id,
            name: payload.data.creator.name,
            email: payload.data.creator.email
          };
        }
        
        if (payload.data.project) {
          metadata.data.project = {
            id: payload.data.project.id,
            name: payload.data.project.name,
            state: payload.data.project.state
          };
        }
        
        if (payload.data.cycle) {
          metadata.data.cycle = {
            id: payload.data.cycle.id,
            name: payload.data.cycle.name,
            number: payload.data.cycle.number
          };
        }
        
        if (payload.data.parent) {
          metadata.data.parent = {
            id: payload.data.parent.id,
            identifier: payload.data.parent.identifier,
            title: payload.data.parent.title
          };
        }
        
        if (payload.data.labels) {
          metadata.data.labels = payload.data.labels.map(l => ({
            id: l.id,
            name: l.name,
            color: l.color
          }));
        }
        break;
        
      case 'Project':
        Object.assign(metadata.data, {
          name: payload.data.name,
          description: payload.data.description,
          icon: payload.data.icon,
          color: payload.data.color,
          state: payload.data.state,
          startDate: payload.data.startDate,
          targetDate: payload.data.targetDate,
          progress: payload.data.progress,
          scopeProgress: payload.data.scopeProgress,
          slackNewIssue: payload.data.slackNewIssue,
          slackIssueComments: payload.data.slackIssueComments,
          slackIssueStatuses: payload.data.slackIssueStatuses,
          url: payload.data.url
        });
        
        if (payload.data.lead) {
          metadata.data.lead = {
            id: payload.data.lead.id,
            name: payload.data.lead.name,
            email: payload.data.lead.email
          };
        }
        
        if (payload.data.milestone) {
          metadata.data.milestone = {
            id: payload.data.milestone.id,
            name: payload.data.milestone.name
          };
        }
        break;
        
      case 'Cycle':
        Object.assign(metadata.data, {
          number: payload.data.number,
          name: payload.data.name,
          description: payload.data.description,
          startsAt: payload.data.startsAt,
          endsAt: payload.data.endsAt,
          completedAt: payload.data.completedAt,
          progress: payload.data.progress,
          scopeProgress: payload.data.scopeProgress
        });
        
        if (payload.data.team) {
          metadata.data.team = {
            id: payload.data.team.id,
            name: payload.data.team.name,
            key: payload.data.team.key
          };
        }
        break;
        
      case 'User':
        Object.assign(metadata.data, {
          name: payload.data.name,
          displayName: payload.data.displayName,
          email: payload.data.email,
          avatarUrl: payload.data.avatarUrl,
          active: payload.data.active,
          admin: payload.data.admin,
          guest: payload.data.guest,
          lastSeen: payload.data.lastSeen,
          statusEmoji: payload.data.statusEmoji,
          statusLabel: payload.data.statusLabel,
          statusUntilAt: payload.data.statusUntilAt,
          timezone: payload.data.timezone,
          url: payload.data.url
        });
        break;
        
      case 'Comment':
        Object.assign(metadata.data, {
          body: payload.data.body,
          edited: payload.data.editedAt ? true : false,
          url: payload.data.url
        });
        
        if (payload.data.issue) {
          metadata.data.issue = {
            id: payload.data.issue.id,
            identifier: payload.data.issue.identifier,
            title: payload.data.issue.title
          };
        }
        
        if (payload.data.user) {
          metadata.data.user = {
            id: payload.data.user.id,
            name: payload.data.user.name,
            email: payload.data.user.email
          };
        }
        
        if (payload.data.parent) {
          metadata.data.parent = {
            id: payload.data.parent.id
          };
        }
        break;
        
      case 'Label':
        Object.assign(metadata.data, {
          name: payload.data.name,
          description: payload.data.description,
          color: payload.data.color
        });
        
        if (payload.data.team) {
          metadata.data.team = {
            id: payload.data.team.id,
            name: payload.data.team.name,
            key: payload.data.team.key
          };
        }
        
        if (payload.data.parent) {
          metadata.data.parent = {
            id: payload.data.parent.id,
            name: payload.data.parent.name
          };
        }
        break;
        
      case 'WorkflowState':
        Object.assign(metadata.data, {
          name: payload.data.name,
          description: payload.data.description,
          color: payload.data.color,
          type: payload.data.type,
          position: payload.data.position
        });
        
        if (payload.data.team) {
          metadata.data.team = {
            id: payload.data.team.id,
            name: payload.data.team.name,
            key: payload.data.team.key
          };
        }
        break;
    }
  }
  
  return metadata;
}

/**
 * Extract comprehensive metadata from Slack payloads
 */
export function extractSlackMetadata(payload) {
  const metadata = {
    timestamp: new Date().toISOString(),
    source: 'slack'
  };
  
  // Event API metadata
  if (payload.event_id) {
    metadata.event_id = payload.event_id;
    metadata.event_time = payload.event_time;
    metadata.event_context = payload.event_context;
  }
  
  // Team/Workspace metadata
  if (payload.team_id || payload.team) {
    metadata.team = {
      id: payload.team_id || payload.team?.id,
      name: payload.team?.name,
      domain: payload.team?.domain
    };
  }
  
  // Enterprise Grid metadata
  if (payload.enterprise_id || payload.enterprise) {
    metadata.enterprise = {
      id: payload.enterprise_id || payload.enterprise?.id,
      name: payload.enterprise?.name
    };
  }
  
  // API App metadata
  if (payload.api_app_id) {
    metadata.api_app_id = payload.api_app_id;
  }
  
  // Event metadata
  if (payload.event) {
    metadata.event_type = payload.event.type;
    metadata.event_subtype = payload.event.subtype;
    
    // Channel metadata from event
    if (payload.event.channel || payload.event.item?.channel) {
      const channelId = payload.event.channel || payload.event.item.channel;
      metadata.channel = {
        id: channelId,
        type: determineChannelType(channelId),
        name: payload.event.channel_name
      };
    }
    
    // User metadata from event
    if (payload.event.user) {
      metadata.user = {
        id: payload.event.user,
        team_id: payload.event.user_team
      };
    }
    
    // Message metadata
    if (payload.event.ts) {
      metadata.message = {
        ts: payload.event.ts,
        thread_ts: payload.event.thread_ts,
        client_msg_id: payload.event.client_msg_id
      };
    }
  }
  
  // Interactive component metadata
  if (payload.type === 'block_actions' || payload.type === 'view_submission') {
    metadata.interaction = {
      type: payload.type,
      trigger_id: payload.trigger_id,
      response_url: payload.response_url
    };
    
    if (payload.user) {
      metadata.user = {
        id: payload.user.id || payload.user.user_id,
        username: payload.user.username || payload.user.name,
        name: payload.user.name,
        team_id: payload.user.team_id
      };
    }
    
    if (payload.channel) {
      metadata.channel = {
        id: payload.channel.id,
        name: payload.channel.name,
        type: payload.channel.type || determineChannelType(payload.channel.id)
      };
    }
    
    if (payload.message) {
      metadata.message = {
        ts: payload.message.ts,
        thread_ts: payload.message.thread_ts,
        text: payload.message.text
      };
    }
    
    if (payload.view) {
      metadata.view = {
        id: payload.view.id,
        team_id: payload.view.team_id,
        type: payload.view.type,
        callback_id: payload.view.callback_id,
        hash: payload.view.hash,
        private_metadata: payload.view.private_metadata
      };
    }
    
    if (payload.actions) {
      metadata.actions = payload.actions.map(action => ({
        type: action.type,
        action_id: action.action_id,
        block_id: action.block_id,
        action_ts: action.action_ts
      }));
    }
  }
  
  // Slash command metadata
  if (payload.command) {
    metadata.command = {
      command: payload.command,
      text: payload.text,
      response_url: payload.response_url,
      trigger_id: payload.trigger_id
    };
    
    metadata.user = {
      id: payload.user_id,
      name: payload.user_name
    };
    
    metadata.channel = {
      id: payload.channel_id,
      name: payload.channel_name
    };
  }
  
  // OAuth/permissions metadata
  if (payload.authorizations) {
    metadata.authorizations = payload.authorizations.map(auth => ({
      enterprise_id: auth.enterprise_id,
      team_id: auth.team_id,
      user_id: auth.user_id,
      is_bot: auth.is_bot,
      is_enterprise_install: auth.is_enterprise_install
    }));
  }
  
  return metadata;
}

// Helper function to determine channel type
function determineChannelType(channelId) {
  if (!channelId) return null;
  
  if (channelId.startsWith('C')) return 'public_channel';
  if (channelId.startsWith('G')) return 'private_channel';
  if (channelId.startsWith('D')) return 'im';
  if (channelId.startsWith('M')) return 'mpim';
  
  return 'unknown';
}