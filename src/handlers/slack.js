// src/handlers/slack.js
import { verifySlackSignature } from '../utils/security.js';
import { extractSlackMetadata } from '../utils/metadata.js';

const SLACK_EVENT_MAPPING = {
  // Message events
  'message': 'message_sent',
  'message.channels': 'channel_message',
  'message.groups': 'private_channel_message',
  'message.im': 'direct_message',
  'message.mpim': 'group_direct_message',
  'app_mention': 'app_mentioned',
  'message_changed': 'message_edited',
  'message_deleted': 'message_deleted',
  'message_replied': 'thread_reply',
  
  // Channel events
  'channel_created': 'channel_created',
  'channel_deleted': 'channel_deleted',
  'channel_archive': 'channel_archived',
  'channel_unarchive': 'channel_unarchived',
  'channel_rename': 'channel_renamed',
  'channel_joined': 'channel_joined',
  'channel_left': 'channel_left',
  'channel_history_changed': 'channel_history_changed',
  'channel_topic': 'channel_topic_changed',
  'channel_purpose': 'channel_purpose_changed',
  
  // User and member events
  'member_joined_channel': 'member_joined_channel',
  'member_left_channel': 'member_left_channel',
  'user_change': 'user_profile_changed',
  'user_typing': 'user_typing',
  'presence_change': 'presence_changed',
  'manual_presence_change': 'manual_presence_changed',
  'user_huddle_changed': 'huddle_status_changed',
  'user_profile_changed': 'profile_updated',
  'user_status_changed': 'status_updated',
  
  // Team events
  'team_join': 'team_member_joined',
  'team_rename': 'team_renamed',
  'team_pref_change': 'team_preferences_changed',
  'team_domain_change': 'team_domain_changed',
  'team_profile_change': 'team_profile_changed',
  'team_profile_delete': 'team_profile_deleted',
  'team_profile_reorder': 'team_profile_reordered',
  
  // File events
  'file_created': 'file_uploaded',
  'file_shared': 'file_shared',
  'file_unshared': 'file_unshared',
  'file_public': 'file_made_public',
  'file_private': 'file_made_private',
  'file_change': 'file_changed',
  'file_deleted': 'file_deleted',
  'file_comment_added': 'file_comment_added',
  'file_comment_edited': 'file_comment_edited',
  'file_comment_deleted': 'file_comment_deleted',
  
  // Reaction events
  'reaction_added': 'reaction_added',
  'reaction_removed': 'reaction_removed',
  
  // Star events
  'star_added': 'item_starred',
  'star_removed': 'item_unstarred',
  
  // Pin events
  'pin_added': 'item_pinned',
  'pin_removed': 'item_unpinned',
  
  // App events
  'app_installed': 'app_installed',
  'app_requested': 'app_requested',
  'app_uninstalled': 'app_uninstalled',
  'app_uninstalled_team': 'app_uninstalled_from_team',
  'app_home_opened': 'app_home_opened',
  'app_rate_limited': 'app_rate_limited',
  
  // Workflow events
  'workflow_step_execute': 'workflow_step_executed',
  'workflow_step_completed': 'workflow_step_completed',
  'workflow_step_failed': 'workflow_step_failed',
  'workflow_published': 'workflow_published',
  'workflow_unpublished': 'workflow_unpublished',
  'workflow_step_deleted': 'workflow_step_deleted',
  
  // Call events
  'call_rejected': 'call_rejected',
  'call_started': 'call_started',
  'call_ended': 'call_ended',
  'call_participant_joined': 'call_participant_joined',
  'call_participant_left': 'call_participant_left',
  'call_participant_shared_screen': 'screen_share_started',
  'call_participant_stopped_screen_share': 'screen_share_stopped',
  
  // Slash command and interactive events
  'slash_command': 'slash_command_used',
  'interactive_message': 'interactive_message_action',
  'block_actions': 'block_action_triggered',
  'view_submission': 'modal_submitted',
  'view_closed': 'modal_closed',
  'shortcut': 'shortcut_triggered',
  'message_action': 'message_action_used',
  'global_shortcut': 'global_shortcut_used',
  'options_request': 'options_requested',
  
  // DND events
  'dnd_updated': 'dnd_status_updated',
  'dnd_updated_user': 'user_dnd_updated',
  
  // Emoji events
  'emoji_added': 'custom_emoji_added',
  'emoji_removed': 'custom_emoji_removed',
  'emoji_renamed': 'custom_emoji_renamed',
  
  // Group events
  'group_open': 'private_channel_opened',
  'group_close': 'private_channel_closed',
  'group_archive': 'private_channel_archived',
  'group_unarchive': 'private_channel_unarchived',
  'group_rename': 'private_channel_renamed',
  'group_joined': 'private_channel_joined',
  'group_left': 'private_channel_left',
  
  // IM events
  'im_open': 'direct_message_opened',
  'im_close': 'direct_message_closed',
  'im_created': 'direct_message_created',
  'im_history_changed': 'direct_message_history_changed',
  
  // Subteam events
  'subteam_created': 'usergroup_created',
  'subteam_updated': 'usergroup_updated',
  'subteam_members_changed': 'usergroup_members_changed',
  'subteam_self_added': 'added_to_usergroup',
  'subteam_self_removed': 'removed_from_usergroup',
  
  // Token events
  'tokens_revoked': 'tokens_revoked',
  'scope_granted': 'oauth_scope_granted',
  'scope_denied': 'oauth_scope_denied',
  
  // Link events
  'link_shared': 'link_shared',
  
  // Grid migration events
  'grid_migration_finished': 'grid_migration_completed',
  'grid_migration_started': 'grid_migration_started',
  
  // Resources events
  'resources_added': 'resources_added',
  'resources_removed': 'resources_removed',
  
  // Bot events
  'bot_added': 'bot_added',
  'bot_changed': 'bot_changed',
  'bot_removed': 'bot_removed',
  
  // Commands events
  'commands_changed': 'slash_commands_changed',
  
  // Email events
  'email_domain_changed': 'email_domain_changed',
  
  // Account events
  'account_changed': 'account_changed',
  
  // Invite events
  'invite_requested': 'invite_requested',
  
  // External org events
  'shared_channel_invite_accepted': 'shared_channel_invite_accepted',
  'shared_channel_invite_approved': 'shared_channel_invite_approved',
  'shared_channel_invite_declined': 'shared_channel_invite_declined',
  'shared_channel_invite_received': 'shared_channel_invite_received',
  'shared_channel_invite_removed': 'shared_channel_invite_removed',
  
  // URL verification (special case)
  'url_verification': 'url_verification'
};

export async function handleSlackEvent(rawBody, payload, headers, config) {
  const signature = headers['x-slack-signature'];
  const timestamp = headers['x-slack-request-timestamp'];
  const retryNum = headers['x-slack-retry-num'];
  const retryReason = headers['x-slack-retry-reason'];
  const requestTimestamp = headers['x-slack-request-timestamp'];
  
  // Verify signature if secret is configured
  if (config.slackSigningSecret && signature && timestamp) {
    const isValid = await verifySlackSignature(
      rawBody,
      timestamp,
      signature,
      config.slackSigningSecret
    );
    
    if (!isValid) {
      return {
        isValid: false,
        error: 'Invalid Slack signature'
      };
    }
  }
  
  // Handle Slack URL verification
  if (payload.type === 'url_verification') {
    return {
      isValid: true,
      eventType: 'url_verification',
      challenge: payload.challenge
    };
  }
  
  // Extract comprehensive metadata
  const metadata = extractSlackMetadata(payload);
  
  // Extract workspace, channel, user, and other entities
  let workspace = null;
  let workspaceId = null;
  let workspaceDomain = null;
  let channel = null;
  let channelId = null;
  let channelType = null;
  let actor = null;
  let actorId = null;
  let actorName = null;
  let actorRealName = null;
  let actorIsBot = false;
  let actorIsApp = false;
  let appId = null;
  let botId = null;
  
  // Extract workspace info
  if (payload.team_id) {
    workspaceId = payload.team_id;
    workspace = payload.team?.name || payload.team_id;
    workspaceDomain = payload.team?.domain;
  } else if (payload.team) {
    workspaceId = payload.team.id;
    workspace = payload.team.name || payload.team.domain;
    workspaceDomain = payload.team.domain;
  }
  
  // Extract channel info based on event structure
  if (payload.event) {
    // Event API structure
    if (payload.event.channel) {
      channelId = payload.event.channel;
      channelType = payload.event.channel_type || determineChannelType(payload.event.channel);
    } else if (payload.event.item?.channel) {
      channelId = payload.event.item.channel;
      channelType = determineChannelType(payload.event.item.channel);
    }
    
    // Extract actor info from event
    if (payload.event.user) {
      actorId = payload.event.user;
    } else if (payload.event.user_id) {
      actorId = payload.event.user_id;
    } else if (payload.event.bot_id) {
      botId = payload.event.bot_id;
      actorId = payload.event.bot_id;
      actorIsBot = true;
    }
  } else if (payload.channel_id || payload.channel) {
    // Interactive components or slash commands
    channelId = payload.channel_id || payload.channel?.id;
    channel = payload.channel?.name;
    channelType = payload.channel?.type || determineChannelType(channelId);
  }
  
  // Extract user info
  if (payload.user_id) {
    actorId = payload.user_id;
    actorName = payload.user_name;
  } else if (payload.user) {
    actorId = payload.user.id || payload.user.user_id;
    actorName = payload.user.name || payload.user.username;
    actorRealName = payload.user.real_name;
    if (payload.user.is_bot) {
      actorIsBot = true;
    }
  }
  
  // Extract app info
  if (payload.api_app_id) {
    appId = payload.api_app_id;
    actorIsApp = true;
  }
  
  // Determine event type
  let eventType = 'unknown';
  let eventSubtype = null;
  let interactionType = null;
  
  if (payload.event && payload.event.type) {
    // Event API
    eventType = payload.event.type;
    eventSubtype = payload.event.subtype;
  } else if (payload.type === 'event_callback' && payload.event) {
    // Event API callback
    eventType = payload.event.type;
    eventSubtype = payload.event.subtype;
  } else if (payload.type === 'block_actions') {
    // Block kit interactions
    eventType = 'block_actions';
    interactionType = 'block_action';
  } else if (payload.type === 'view_submission') {
    // Modal submissions
    eventType = 'view_submission';
    interactionType = 'modal_submit';
  } else if (payload.type === 'view_closed') {
    // Modal closed
    eventType = 'view_closed';
    interactionType = 'modal_close';
  } else if (payload.type === 'shortcut') {
    // Shortcuts
    eventType = 'shortcut';
    interactionType = payload.callback_id;
  } else if (payload.type === 'message_action') {
    // Message shortcuts
    eventType = 'message_action';
    interactionType = payload.callback_id;
  } else if (payload.type === 'slash_command') {
    // Slash commands (though these usually come differently)
    eventType = 'slash_command';
    interactionType = payload.command;
  } else if (payload.type === 'interactive_message') {
    // Legacy interactive messages
    eventType = 'interactive_message';
    interactionType = payload.callback_id;
  } else if (payload.type) {
    eventType = payload.type;
  }
  
  // Map to specific event type
  let specificEventType = eventType;
  if (eventSubtype) {
    const combinedType = `${eventType}.${eventSubtype}`;
    if (SLACK_EVENT_MAPPING[combinedType]) {
      specificEventType = SLACK_EVENT_MAPPING[combinedType];
    } else if (SLACK_EVENT_MAPPING[eventType]) {
      specificEventType = SLACK_EVENT_MAPPING[eventType];
    }
  } else if (SLACK_EVENT_MAPPING[eventType]) {
    specificEventType = SLACK_EVENT_MAPPING[eventType];
  }
  
  // Extract additional context based on event type
  let additionalContext = {};
  
  if (eventType === 'message' || eventType.startsWith('message')) {
    const msg = payload.event || payload;
    additionalContext = {
      message_text: msg.text,
      message_ts: msg.ts,
      message_thread_ts: msg.thread_ts,
      message_is_thread_reply: !!msg.thread_ts,
      message_subtype: msg.subtype,
      message_edited: msg.edited ? true : false,
      message_hidden: msg.hidden,
      message_deleted: msg.deleted,
      message_pinned: msg.pinned,
      message_reactions: msg.reactions?.map(r => ({ name: r.name, count: r.count })) || [],
      message_files: msg.files?.map(f => ({ id: f.id, name: f.name, mimetype: f.mimetype })) || [],
      message_attachments_count: msg.attachments?.length || 0,
      message_blocks_count: msg.blocks?.length || 0,
      message_bot_id: msg.bot_id,
      message_app_id: msg.app_id,
      message_mentions: extractMentions(msg.text || ''),
      message_links: extractLinks(msg.text || '')
    };
  } else if (eventType === 'reaction_added' || eventType === 'reaction_removed') {
    additionalContext = {
      reaction_name: payload.event.reaction,
      reaction_item_type: payload.event.item?.type,
      reaction_item_channel: payload.event.item?.channel,
      reaction_item_ts: payload.event.item?.ts,
      reaction_item_file: payload.event.item?.file,
      reaction_item_file_comment: payload.event.item?.file_comment
    };
  } else if (eventType === 'file_created' || eventType === 'file_shared' || eventType === 'file_change') {
    const file = payload.event.file || payload.event;
    additionalContext = {
      file_id: file.id,
      file_name: file.name,
      file_title: file.title,
      file_mimetype: file.mimetype,
      file_size: file.size,
      file_is_public: file.is_public,
      file_is_external: file.is_external,
      file_channels: file.channels || [],
      file_groups: file.groups || [],
      file_ims: file.ims || [],
      file_comments_count: file.comments_count || 0,
      file_initial_comment: file.initial_comment?.comment,
      file_shares: file.shares ? Object.keys(file.shares).length : 0
    };
  } else if (eventType === 'channel_created' || eventType === 'channel_rename') {
    const chan = payload.event.channel || payload.event;
    additionalContext = {
      channel_id: chan.id,
      channel_name: chan.name,
      channel_name_previous: chan.name_previous,
      channel_created: chan.created,
      channel_creator: chan.creator,
      channel_is_private: chan.is_private,
      channel_is_shared: chan.is_shared,
      channel_is_org_shared: chan.is_org_shared,
      channel_is_archived: chan.is_archived
    };
  } else if (eventType === 'team_join' || eventType === 'user_change') {
    const user = payload.event.user || payload.event;
    additionalContext = {
      user_id: user.id,
      user_name: user.name,
      user_real_name: user.real_name,
      user_display_name: user.profile?.display_name,
      user_email: user.profile?.email,
      user_title: user.profile?.title,
      user_status_text: user.profile?.status_text,
      user_status_emoji: user.profile?.status_emoji,
      user_is_admin: user.is_admin,
      user_is_owner: user.is_owner,
      user_is_primary_owner: user.is_primary_owner,
      user_is_restricted: user.is_restricted,
      user_is_ultra_restricted: user.is_ultra_restricted,
      user_is_bot: user.is_bot,
      user_is_app_user: user.is_app_user,
      user_has_2fa: user.has_2fa,
      user_timezone: user.tz,
      user_locale: user.locale
    };
  } else if (eventType === 'app_mention') {
    additionalContext = {
      mention_text: payload.event.text,
      mention_ts: payload.event.ts,
      mention_thread_ts: payload.event.thread_ts,
      mention_is_thread_reply: !!payload.event.thread_ts,
      mention_channel: payload.event.channel,
      mention_team: payload.event.team
    };
  } else if (eventType === 'block_actions' && payload.actions) {
    additionalContext = {
      action_count: payload.actions.length,
      actions: payload.actions.map(action => ({
        action_id: action.action_id,
        block_id: action.block_id,
        type: action.type,
        value: action.value || action.selected_option?.value || action.selected_date || action.selected_time,
        action_ts: action.action_ts
      })),
      response_url: payload.response_url,
      trigger_id: payload.trigger_id,
      container_type: payload.container?.type,
      container_message_ts: payload.container?.message_ts,
      view_id: payload.view?.id,
      view_callback_id: payload.view?.callback_id
    };
  } else if (eventType === 'view_submission' && payload.view) {
    additionalContext = {
      view_id: payload.view.id,
      view_callback_id: payload.view.callback_id,
      view_type: payload.view.type,
      view_private_metadata: payload.view.private_metadata,
      view_state_values: Object.keys(payload.view.state?.values || {}),
      response_urls: payload.response_urls?.length || 0,
      trigger_id: payload.trigger_id
    };
  } else if (eventType === 'slash_command') {
    additionalContext = {
      command: payload.command,
      command_text: payload.text,
      response_url: payload.response_url,
      trigger_id: payload.trigger_id
    };
  }
  
  // Handle retry information
  if (retryNum) {
    additionalContext.retry_number = parseInt(retryNum);
    additionalContext.retry_reason = retryReason;
  }
  
  // Extract enterprise grid information if present
  let enterpriseId = null;
  let enterpriseName = null;
  if (payload.enterprise || payload.enterprise_id) {
    enterpriseId = payload.enterprise_id || payload.enterprise?.id;
    enterpriseName = payload.enterprise?.name;
  }
  
  return {
    isValid: true,
    eventType: specificEventType,
    repository: workspace, // Using workspace as repository equivalent
    repositoryId: workspaceId,
    channel,
    channelId,
    channelType,
    actor: actorName || actorId,
    actorId,
    actorName,
    actorRealName,
    actorIsBot,
    actorIsApp,
    appId,
    botId,
    enterpriseId,
    enterpriseName,
    workspaceDomain,
    timestamp: requestTimestamp,
    metadata,
    additionalContext,
    rawEventType: eventType,
    eventSubtype,
    interactionType,
    eventId: payload.event_id,
    eventTime: payload.event_time
  };
}

// Helper function to determine channel type from ID
function determineChannelType(channelId) {
  if (!channelId) return null;
  
  if (channelId.startsWith('C')) return 'public_channel';
  if (channelId.startsWith('G')) return 'private_channel';
  if (channelId.startsWith('D')) return 'im';
  if (channelId.startsWith('M')) return 'mpim';
  
  return 'unknown';
}

// Helper function to extract mentions from text
function extractMentions(text) {
  const mentions = [];
  const userMentionRegex = /<@([UW][A-Z0-9]+)(\|([^>]+))?>/g;
  const channelMentionRegex = /<#([CG][A-Z0-9]+)(\|([^>]+))?>/g;
  const specialMentionRegex = /<!([^>]+)(\|([^>]+))?>/g;
  
  let match;
  
  // Extract user mentions
  while ((match = userMentionRegex.exec(text)) !== null) {
    mentions.push({
      type: 'user',
      id: match[1],
      name: match[3] || null
    });
  }
  
  // Extract channel mentions
  while ((match = channelMentionRegex.exec(text)) !== null) {
    mentions.push({
      type: 'channel',
      id: match[1],
      name: match[3] || null
    });
  }
  
  // Extract special mentions
  while ((match = specialMentionRegex.exec(text)) !== null) {
    mentions.push({
      type: 'special',
      name: match[1],
      label: match[3] || null
    });
  }
  
  return mentions;
}

// Helper function to extract links from text
function extractLinks(text) {
  const links = [];
  const linkRegex = /<(https?:\/\/[^|>]+)(\|([^>]+))?>/g;
  
  let match;
  while ((match = linkRegex.exec(text)) !== null) {
    links.push({
      url: match[1],
      label: match[3] || null
    });
  }
  
  return links;
}