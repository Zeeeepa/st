// src/handlers/linear.js
import { verifyLinearSignature } from '../utils/security.js';
import { extractLinearMetadata } from '../utils/metadata.js';

const LINEAR_EVENT_MAPPING = {
  'Issue': {
    create: 'issue_created',
    update: 'issue_updated',
    remove: 'issue_deleted',
    'state:update': 'issue_state_changed',
    'assignee:update': 'issue_assignee_changed',
    'priority:update': 'issue_priority_changed',
    'estimate:update': 'issue_estimate_changed',
    'label:add': 'issue_label_added',
    'label:remove': 'issue_label_removed',
    'project:add': 'issue_added_to_project',
    'project:remove': 'issue_removed_from_project',
    'cycle:add': 'issue_added_to_cycle',
    'cycle:remove': 'issue_removed_from_cycle',
    'parent:update': 'issue_parent_changed',
    'subscriber:add': 'issue_subscriber_added',
    'subscriber:remove': 'issue_subscriber_removed',
    'dueDate:update': 'issue_due_date_changed',
    'attachment:create': 'issue_attachment_added',
    'attachment:remove': 'issue_attachment_removed',
    'reaction:create': 'issue_reaction_added',
    'reaction:remove': 'issue_reaction_removed'
  },
  'Comment': {
    create: 'comment_created',
    update: 'comment_updated',
    remove: 'comment_deleted',
    'reaction:create': 'comment_reaction_added',
    'reaction:remove': 'comment_reaction_removed'
  },
  'Project': {
    create: 'project_created',
    update: 'project_updated',
    remove: 'project_deleted',
    'state:update': 'project_state_changed',
    'lead:update': 'project_lead_changed',
    'member:add': 'project_member_added',
    'member:remove': 'project_member_removed',
    'milestone:add': 'project_milestone_added',
    'milestone:remove': 'project_milestone_removed',
    'milestone:update': 'project_milestone_updated'
  },
  'ProjectUpdate': {
    create: 'project_update_created',
    update: 'project_update_edited',
    remove: 'project_update_deleted'
  },
  'Cycle': {
    create: 'cycle_created',
    update: 'cycle_updated',
    remove: 'cycle_deleted',
    'state:update': 'cycle_state_changed',
    'progress:update': 'cycle_progress_updated'
  },
  'User': {
    create: 'user_created',
    update: 'user_updated',
    remove: 'user_removed',
    'active:update': 'user_activation_changed',
    'admin:update': 'user_admin_status_changed'
  },
  'Team': {
    create: 'team_created',
    update: 'team_updated',
    remove: 'team_deleted',
    'member:add': 'team_member_added',
    'member:remove': 'team_member_removed',
    'key:update': 'team_key_changed',
    'settings:update': 'team_settings_updated'
  },
  'Label': {
    create: 'label_created',
    update: 'label_updated',
    remove: 'label_deleted',
    'parent:update': 'label_parent_changed'
  },
  'Workflow': {
    create: 'workflow_created',
    update: 'workflow_updated',
    remove: 'workflow_deleted',
    'state:add': 'workflow_state_added',
    'state:remove': 'workflow_state_removed',
    'state:update': 'workflow_state_updated'
  },
  'WorkflowState': {
    create: 'workflow_state_created',
    update: 'workflow_state_updated',
    remove: 'workflow_state_deleted',
    'position:update': 'workflow_state_position_changed'
  },
  'Milestone': {
    create: 'milestone_created',
    update: 'milestone_updated',
    remove: 'milestone_deleted'
  },
  'Objective': {
    create: 'objective_created',
    update: 'objective_updated',
    remove: 'objective_deleted',
    'progress:update': 'objective_progress_updated'
  },
  'KeyResult': {
    create: 'key_result_created',
    update: 'key_result_updated',
    remove: 'key_result_deleted',
    'progress:update': 'key_result_progress_updated'
  },
  'Roadmap': {
    create: 'roadmap_created',
    update: 'roadmap_updated',
    remove: 'roadmap_deleted'
  },
  'RoadmapItem': {
    create: 'roadmap_item_created',
    update: 'roadmap_item_updated',
    remove: 'roadmap_item_deleted'
  },
  'Integration': {
    create: 'integration_created',
    update: 'integration_updated',
    remove: 'integration_deleted',
    'enable:update': 'integration_status_changed'
  },
  'Webhook': {
    create: 'webhook_created',
    update: 'webhook_updated',
    remove: 'webhook_deleted',
    'enable:update': 'webhook_status_changed'
  },
  'Attachment': {
    create: 'attachment_created',
    update: 'attachment_updated',
    remove: 'attachment_deleted'
  },
  'Reaction': {
    create: 'reaction_added',
    remove: 'reaction_removed'
  },
  'Notification': {
    create: 'notification_created',
    update: 'notification_updated',
    'read:update': 'notification_read_status_changed',
    'archive:update': 'notification_archive_status_changed'
  },
  'Document': {
    create: 'document_created',
    update: 'document_updated',
    remove: 'document_deleted'
  },
  'DocumentContent': {
    update: 'document_content_updated'
  },
  'Favorite': {
    create: 'favorite_added',
    remove: 'favorite_removed'
  },
  'CustomView': {
    create: 'custom_view_created',
    update: 'custom_view_updated',
    remove: 'custom_view_deleted'
  },
  'ApiKey': {
    create: 'api_key_created',
    remove: 'api_key_deleted'
  },
  'Subscription': {
    create: 'subscription_created',
    update: 'subscription_updated',
    remove: 'subscription_deleted'
  },
  'Template': {
    create: 'template_created',
    update: 'template_updated',
    remove: 'template_deleted'
  }
};

export async function handleLinearEvent(rawBody, payload, headers, config) {
  const eventType = headers['x-linear-event'] || 'unknown';
  const signature = headers['x-linear-signature'];
  const deliveryId = headers['x-linear-delivery'];
  const timestamp = headers['x-linear-timestamp'];
  
  // Verify signature if secret is configured
  if (config.linearWebhookSecret && signature) {
    const isValid = await verifyLinearSignature(
      rawBody,
      signature,
      config.linearWebhookSecret
    );
    
    if (!isValid) {
      return {
        isValid: false,
        error: 'Invalid Linear signature'
      };
    }
  }
  
  // Extract comprehensive metadata
  const metadata = extractLinearMetadata(payload);
  
  // Extract organization, team, user, and other entities
  let organization = null;
  let organizationId = null;
  let team = null;
  let teamId = null;
  let actor = null;
  let actorId = null;
  let actorEmail = null;
  let targetEntity = null;
  let targetEntityId = null;
  let targetEntityType = null;
  
  // Extract organization info
  if (payload.organizationId) {
    organizationId = payload.organizationId;
  }
  
  // Extract team info
  if (payload.data?.team) {
    team = payload.data.team.name || payload.data.team.key;
    teamId = payload.data.team.id;
  } else if (payload.teamId) {
    teamId = payload.teamId;
  }
  
  // Extract actor info
  if (payload.data?.user) {
    actor = payload.data.user.name || payload.data.user.email;
    actorId = payload.data.user.id;
    actorEmail = payload.data.user.email;
  } else if (payload.data?.createdBy) {
    actor = payload.data.createdBy.name || payload.data.createdBy.email;
    actorId = payload.data.createdBy.id;
    actorEmail = payload.data.createdBy.email;
  } else if (payload.data?.updatedBy) {
    actor = payload.data.updatedBy.name || payload.data.updatedBy.email;
    actorId = payload.data.updatedBy.id;
    actorEmail = payload.data.updatedBy.email;
  }
  
  // Extract target entity info
  if (payload.data) {
    targetEntityId = payload.data.id;
    targetEntityType = payload.type;
    
    // Try to get a meaningful name for the entity
    if (payload.data.title) {
      targetEntity = payload.data.title;
    } else if (payload.data.name) {
      targetEntity = payload.data.name;
    } else if (payload.data.identifier) {
      targetEntity = payload.data.identifier;
    } else if (payload.data.key) {
      targetEntity = payload.data.key;
    }
  }
  
  // Generate specific event type
  let specificEventType = eventType;
  
  if (payload.type && LINEAR_EVENT_MAPPING[payload.type]) {
    if (payload.action && LINEAR_EVENT_MAPPING[payload.type][payload.action]) {
      specificEventType = LINEAR_EVENT_MAPPING[payload.type][payload.action];
    } else if (typeof LINEAR_EVENT_MAPPING[payload.type] === 'string') {
      specificEventType = LINEAR_EVENT_MAPPING[payload.type];
    }
  } else if (payload.type && payload.action) {
    specificEventType = `${payload.type.toLowerCase()}_${payload.action}`;
  }
  
  // Extract additional context based on entity type
  let additionalContext = {};
  
  if (payload.type === 'Issue' && payload.data) {
    additionalContext = {
      issue_identifier: payload.data.identifier,
      issue_title: payload.data.title,
      issue_description: payload.data.description,
      issue_priority: payload.data.priority,
      issue_priority_label: payload.data.priorityLabel,
      issue_state: payload.data.state?.name,
      issue_state_type: payload.data.state?.type,
      issue_assignee: payload.data.assignee?.name,
      issue_assignee_id: payload.data.assignee?.id,
      issue_creator: payload.data.creator?.name,
      issue_creator_id: payload.data.creator?.id,
      issue_labels: payload.data.labels?.map(l => l.name) || [],
      issue_estimate: payload.data.estimate,
      issue_due_date: payload.data.dueDate,
      issue_completed_at: payload.data.completedAt,
      issue_canceled_at: payload.data.canceledAt,
      issue_started_at: payload.data.startedAt,
      issue_cycle: payload.data.cycle?.name,
      issue_cycle_id: payload.data.cycle?.id,
      issue_project: payload.data.project?.name,
      issue_project_id: payload.data.project?.id,
      issue_parent_id: payload.data.parent?.id,
      issue_parent_identifier: payload.data.parent?.identifier,
      issue_subscriber_count: payload.data.subscribers?.length || 0,
      issue_comment_count: payload.data.comments?.length || 0,
      issue_attachment_count: payload.data.attachments?.length || 0,
      issue_sub_issues_count: payload.data.children?.length || 0
    };
  } else if (payload.type === 'Project' && payload.data) {
    additionalContext = {
      project_name: payload.data.name,
      project_description: payload.data.description,
      project_state: payload.data.state,
      project_lead: payload.data.lead?.name,
      project_lead_id: payload.data.lead?.id,
      project_start_date: payload.data.startDate,
      project_target_date: payload.data.targetDate,
      project_member_count: payload.data.members?.length || 0,
      project_milestone_count: payload.data.milestones?.length || 0,
      project_issue_count: payload.data.issues?.length || 0,
      project_progress: payload.data.progress,
      project_status: payload.data.status,
      project_health: payload.data.health
    };
  } else if (payload.type === 'Cycle' && payload.data) {
    additionalContext = {
      cycle_name: payload.data.name,
      cycle_description: payload.data.description,
      cycle_number: payload.data.number,
      cycle_start_date: payload.data.startDate,
      cycle_end_date: payload.data.endDate,
      cycle_progress: payload.data.progress,
      cycle_issues_count: payload.data.issues?.length || 0,
      cycle_completed_issues_count: payload.data.completedIssuesCount,
      cycle_scope_change: payload.data.scopeChange,
      cycle_completion_rate: payload.data.completionRate
    };
  } else if (payload.type === 'Comment' && payload.data) {
    additionalContext = {
      comment_body: payload.data.body,
      comment_author: payload.data.user?.name,
      comment_author_id: payload.data.user?.id,
      comment_issue_id: payload.data.issue?.id,
      comment_issue_identifier: payload.data.issue?.identifier,
      comment_parent_id: payload.data.parent?.id,
      comment_edited: payload.data.editedAt ? true : false,
      comment_reaction_count: payload.data.reactions?.length || 0
    };
  } else if (payload.type === 'User' && payload.data) {
    additionalContext = {
      user_name: payload.data.name,
      user_email: payload.data.email,
      user_display_name: payload.data.displayName,
      user_avatar_url: payload.data.avatarUrl,
      user_active: payload.data.active,
      user_admin: payload.data.admin,
      user_created_at: payload.data.createdAt,
      user_last_seen: payload.data.lastSeen,
      user_timezone: payload.data.timezone
    };
  } else if (payload.type === 'WorkflowState' && payload.data) {
    additionalContext = {
      state_name: payload.data.name,
      state_color: payload.data.color,
      state_position: payload.data.position,
      state_type: payload.data.type,
      state_description: payload.data.description,
      state_team_id: payload.data.team?.id
    };
  }
  
  // Extract webhook metadata
  const webhookMetadata = {
    url: payload.url,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt
  };
  
  return {
    isValid: true,
    eventType: specificEventType,
    repository: team, // Using team as repository equivalent
    repositoryId: teamId,
    organization,
    organizationId,
    actor,
    actorId,
    actorEmail,
    targetEntity,
    targetEntityId,
    targetEntityType,
    deliveryId,
    timestamp,
    metadata,
    additionalContext,
    webhookMetadata,
    rawEventType: eventType,
    action: payload.action,
    modelType: payload.type
  };
}