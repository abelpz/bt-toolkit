# Collaborative Workflows Use Case

Building team-based applications with real-time synchronization, notification systems, and collaborative editing workflows using the Linked Panels library.

## Overview

Collaborative workflows benefit from the Linked Panels library's ability to:
- **Synchronize state** across multiple users and panels in real-time
- **Coordinate team interactions** with inter-resource messaging
- **Track activity and changes** with persistent state management
- **Manage complex workflows** with role-based access and notifications
- **Support offline collaboration** with robust state synchronization

## Common Collaborative Scenarios

### Team Document Editor

Create a collaborative document editing environment:

```tsx
import { LinkedPanelsContainer, LinkedPanel, HTTPStorageAdapter } from 'linked-panels';

function CollaborativeEditor() {
  const config = {
    resources: [
      // Main document
      { 
        id: 'document-editor', 
        component: <DocumentEditor />, 
        title: 'Document',
        category: 'content'
      },
      // Comments and reviews
      { 
        id: 'comment-panel', 
        component: <CommentPanel />, 
        title: 'Comments',
        category: 'feedback'
      },
      // Team activity
      { 
        id: 'activity-feed', 
        component: <ActivityFeed />, 
        title: 'Activity',
        category: 'tracking'
      },
      // User presence
      { 
        id: 'user-presence', 
        component: <UserPresence />, 
        title: 'Team',
        category: 'collaboration'
      },
      // Version history
      { 
        id: 'version-history', 
        component: <VersionHistory />, 
        title: 'History',
        category: 'versioning'
      }
    ],
    panels: {
      'main-panel': { 
        resourceIds: ['document-editor'],
        initialResourceId: 'document-editor'
      },
      'sidebar-panel': { 
        resourceIds: ['comment-panel', 'activity-feed', 'user-presence'],
        initialResourceId: 'comment-panel'
      },
      'bottom-panel': { 
        resourceIds: ['version-history'],
        initialResourceId: 'version-history'
      }
    }
  };

  // Server-side storage for real-time collaboration
  const persistenceOptions = {
    storageAdapter: new HTTPStorageAdapter({
      baseUrl: 'https://api.myapp.com/collaboration',
      headers: { 
        'Authorization': `Bearer ${authToken}`,
        'X-User-ID': currentUser.id
      }
    }),
    autoSave: true,
    autoSaveDebounce: 500, // Faster sync for collaboration
    persistMessages: true,
    messageFilter: (message) => {
      // Persist collaboration messages
      return ['user-action', 'document-change', 'comment-added']
        .includes(message.content.type);
    }
  };

  return (
    <LinkedPanelsContainer 
      config={config} 
      persistence={persistenceOptions}
    >
      <div className="collaborative-editor">
        <header className="editor-header">
          <LinkedPanel id="sidebar-panel">
            {({ current, navigate }) => (
              <nav className="panel-tabs">
                <button 
                  onClick={() => navigate.toIndex(0)}
                  className={current.index === 0 ? 'active' : ''}
                >
                  Comments
                </button>
                <button 
                  onClick={() => navigate.toIndex(1)}
                  className={current.index === 1 ? 'active' : ''}
                >
                  Activity
                </button>
                <button 
                  onClick={() => navigate.toIndex(2)}
                  className={current.index === 2 ? 'active' : ''}
                >
                  Team
                </button>
              </nav>
            )}
          </LinkedPanel>
        </header>

        <div className="editor-body">
          <LinkedPanel id="main-panel">
            {({ current }) => (
              <main className="document-area">
                {current.resource?.component}
              </main>
            )}
          </LinkedPanel>

          <LinkedPanel id="sidebar-panel">
            {({ current }) => (
              <aside className="collaboration-sidebar">
                {current.resource?.component}
              </aside>
            )}
          </LinkedPanel>
        </div>

        <LinkedPanel id="bottom-panel">
          {({ current }) => (
            <footer className="history-panel">
              {current.resource?.component}
            </footer>
          )}
        </LinkedPanel>
      </div>
    </LinkedPanelsContainer>
  );
}
```

### Real-time Document Editor

Document editor with real-time collaborative features:

```tsx
import { useResourceAPI } from 'linked-panels';

function DocumentEditor({ id }) {
  const api = useResourceAPI(id);
  const messages = api.messaging.getMessages();
  const [content, setContent] = useState('');
  const [cursors, setCursors] = useState({});
  const [isTyping, setIsTyping] = useState(false);

  // Handle real-time changes from other users
  useEffect(() => {
    const documentChanges = messages.filter(msg => 
      msg.content.type === 'document-change' &&
      msg.fromResourceId !== id // Ignore our own messages
    );
    
    const latestChange = documentChanges[documentChanges.length - 1];
    if (latestChange) {
      const { operation, position, text } = latestChange.content.data;
      
      setContent(prevContent => {
        switch (operation) {
          case 'insert':
            return prevContent.slice(0, position) + text + prevContent.slice(position);
          case 'delete':
            return prevContent.slice(0, position) + prevContent.slice(position + text.length);
          default:
            return prevContent;
        }
      });
    }
  }, [messages, id]);

  // Handle cursor positions from other users
  useEffect(() => {
    const cursorUpdates = messages.filter(msg => 
      msg.content.type === 'cursor-position'
    );
    
    const latestCursors = {};
    cursorUpdates.forEach(msg => {
      latestCursors[msg.fromResourceId] = msg.content.data;
    });
    
    setCursors(latestCursors);
  }, [messages]);

  // Send document changes to other users
  const handleContentChange = (newContent, operation) => {
    setContent(newContent);
    setIsTyping(true);
    
    // Broadcast change to other users
    api.messaging.sendToAll({
      type: 'document-change',
      lifecycle: 'event',
      data: {
        operation: operation.type,
        position: operation.position,
        text: operation.text,
        userId: currentUser.id,
        timestamp: Date.now()
      }
    });

    // Update activity feed
    api.messaging.send('activity-feed', {
      type: 'user-action',
      lifecycle: 'event',
      data: {
        action: 'document-edit',
        userId: currentUser.id,
        details: `Edited document at position ${operation.position}`,
        timestamp: Date.now()
      }
    });

    // Clear typing indicator after delay
    setTimeout(() => setIsTyping(false), 2000);
  };

  // Send cursor position updates
  const handleCursorMove = (position) => {
    api.messaging.sendToAll({
      type: 'cursor-position',
      lifecycle: 'state',
      stateKey: 'cursor',
      data: {
        position,
        userId: currentUser.id,
        userName: currentUser.name,
        timestamp: Date.now()
      }
    });
  };

  // Add comment to specific text selection
  const addComment = (selection, comment) => {
    api.messaging.send('comment-panel', {
      type: 'comment-added',
      lifecycle: 'event',
      data: {
        selection,
        comment,
        author: currentUser.name,
        timestamp: Date.now()
      }
    });

    // Update activity feed
    api.messaging.send('activity-feed', {
      type: 'user-action',
      lifecycle: 'event',
      data: {
        action: 'comment-added',
        userId: currentUser.id,
        details: `Added comment: "${comment.substring(0, 50)}..."`,
        timestamp: Date.now()
      }
    });
  };

  return (
    <div className="document-editor">
      <div className="editor-toolbar">
        <button onClick={() => handleSave()}>Save</button>
        <button onClick={() => handleUndo()}>Undo</button>
        <button onClick={() => handleRedo()}>Redo</button>
        {isTyping && <span className="typing-indicator">Typing...</span>}
      </div>
      
      <div className="editor-container">
        <CollaborativeTextEditor
          content={content}
          cursors={cursors}
          onChange={handleContentChange}
          onCursorMove={handleCursorMove}
          onAddComment={addComment}
        />
      </div>
      
      <div className="editor-status">
        <span>Characters: {content.length}</span>
        <span>Collaborators: {Object.keys(cursors).length}</span>
      </div>
    </div>
  );
}
```

### Comment and Review Panel

Collaborative commenting system:

```tsx
function CommentPanel({ id }) {
  const api = useResourceAPI(id);
  const messages = api.messaging.getMessages();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  // Process incoming comments
  useEffect(() => {
    const commentMessages = messages.filter(msg => 
      msg.content.type === 'comment-added' ||
      msg.content.type === 'comment-resolved' ||
      msg.content.type === 'comment-replied'
    );
    
    const processedComments = processCommentMessages(commentMessages);
    setComments(processedComments);
  }, [messages]);

  const addComment = () => {
    if (!newComment.trim()) return;

    const comment = {
      id: generateId(),
      text: newComment,
      author: currentUser.name,
      authorId: currentUser.id,
      timestamp: Date.now(),
      status: 'open',
      replies: []
    };

    // Add to local state
    setComments(prev => [...prev, comment]);
    setNewComment('');

    // Broadcast to other users
    api.messaging.sendToAll({
      type: 'comment-added',
      lifecycle: 'event',
      data: comment
    });

    // Notify document editor
    api.messaging.send('document-editor', {
      type: 'comment-notification',
      lifecycle: 'event',
      data: {
        commentId: comment.id,
        message: `New comment from ${currentUser.name}`
      }
    });
  };

  const resolveComment = (commentId) => {
    setComments(prev => 
      prev.map(comment => 
        comment.id === commentId 
          ? { ...comment, status: 'resolved' }
          : comment
      )
    );

    // Broadcast resolution
    api.messaging.sendToAll({
      type: 'comment-resolved',
      lifecycle: 'event',
      data: {
        commentId,
        resolvedBy: currentUser.id,
        timestamp: Date.now()
      }
    });

    // Update activity feed
    api.messaging.send('activity-feed', {
      type: 'user-action',
      lifecycle: 'event',
      data: {
        action: 'comment-resolved',
        userId: currentUser.id,
        details: `Resolved comment`,
        timestamp: Date.now()
      }
    });
  };

  const replyToComment = (commentId, replyText) => {
    const reply = {
      id: generateId(),
      text: replyText,
      author: currentUser.name,
      authorId: currentUser.id,
      timestamp: Date.now()
    };

    setComments(prev => 
      prev.map(comment => 
        comment.id === commentId 
          ? { ...comment, replies: [...comment.replies, reply] }
          : comment
      )
    );

    // Broadcast reply
    api.messaging.sendToAll({
      type: 'comment-replied',
      lifecycle: 'event',
      data: {
        commentId,
        reply
      }
    });
  };

  return (
    <div className="comment-panel">
      <h3>Comments & Reviews</h3>
      
      <div className="comment-input">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={3}
        />
        <button onClick={addComment} disabled={!newComment.trim()}>
          Add Comment
        </button>
      </div>
      
      <div className="comments-list">
        {comments.map(comment => (
          <div 
            key={comment.id} 
            className={`comment ${comment.status}`}
          >
            <div className="comment-header">
              <span className="comment-author">{comment.author}</span>
              <span className="comment-time">
                {formatTime(comment.timestamp)}
              </span>
              <span className={`comment-status ${comment.status}`}>
                {comment.status}
              </span>
            </div>
            
            <div className="comment-body">
              {comment.text}
            </div>
            
            {comment.replies.length > 0 && (
              <div className="comment-replies">
                {comment.replies.map(reply => (
                  <div key={reply.id} className="comment-reply">
                    <strong>{reply.author}:</strong> {reply.text}
                  </div>
                ))}
              </div>
            )}
            
            <div className="comment-actions">
              {comment.status === 'open' && (
                <button onClick={() => resolveComment(comment.id)}>
                  Resolve
                </button>
              )}
              <button onClick={() => showReplyDialog(comment.id)}>
                Reply
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Activity Feed Component

Track and display team activity:

```tsx
function ActivityFeed({ id }) {
  const api = useResourceAPI(id);
  const messages = api.messaging.getMessages();
  const [activities, setActivities] = useState([]);
  const [filter, setFilter] = useState('all');

  // Process activity messages
  useEffect(() => {
    const activityMessages = messages.filter(msg => 
      msg.content.type === 'user-action'
    );
    
    const processedActivities = activityMessages
      .map(msg => ({
        id: msg.id,
        userId: msg.content.data.userId,
        action: msg.content.data.action,
        details: msg.content.data.details,
        timestamp: msg.content.data.timestamp
      }))
      .sort((a, b) => b.timestamp - a.timestamp); // Most recent first
    
    setActivities(processedActivities);
  }, [messages]);

  const filteredActivities = useMemo(() => {
    if (filter === 'all') return activities;
    return activities.filter(activity => activity.action === filter);
  }, [activities, filter]);

  const getActivityIcon = (action) => {
    const icons = {
      'document-edit': '📝',
      'comment-added': '💬',
      'comment-resolved': '✅',
      'user-joined': '👋',
      'user-left': '👋',
      'file-uploaded': '📎',
      'version-created': '🏷️'
    };
    return icons[action] || '📋';
  };

  const getActivityColor = (action) => {
    const colors = {
      'document-edit': 'blue',
      'comment-added': 'green',
      'comment-resolved': 'purple',
      'user-joined': 'success',
      'user-left': 'muted',
      'file-uploaded': 'orange',
      'version-created': 'info'
    };
    return colors[action] || 'default';
  };

  return (
    <div className="activity-feed">
      <div className="activity-header">
        <h3>Activity Feed</h3>
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)}
          className="activity-filter"
        >
          <option value="all">All Activity</option>
          <option value="document-edit">Edits</option>
          <option value="comment-added">Comments</option>
          <option value="comment-resolved">Resolutions</option>
          <option value="file-uploaded">Files</option>
        </select>
      </div>
      
      <div className="activity-list">
        {filteredActivities.length === 0 ? (
          <div className="no-activity">
            No recent activity
          </div>
        ) : (
          filteredActivities.map(activity => (
            <div 
              key={activity.id} 
              className={`activity-item ${getActivityColor(activity.action)}`}
            >
              <div className="activity-icon">
                {getActivityIcon(activity.action)}
              </div>
              <div className="activity-content">
                <div className="activity-details">
                  {activity.details}
                </div>
                <div className="activity-meta">
                  <span className="activity-user">
                    {getUserName(activity.userId)}
                  </span>
                  <span className="activity-time">
                    {formatTimeAgo(activity.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {activities.length > 50 && (
        <button 
          className="load-more"
          onClick={() => loadMoreActivities()}
        >
          Load More Activity
        </button>
      )}
    </div>
  );
}
```

### User Presence Component

Show who's currently collaborating:

```tsx
function UserPresence({ id }) {
  const api = useResourceAPI(id);
  const messages = api.messaging.getMessages();
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [userStatus, setUserStatus] = useState({});

  // Track user presence
  useEffect(() => {
    // Announce our presence
    api.messaging.sendToAll({
      type: 'user-presence',
      lifecycle: 'state',
      stateKey: 'presence',
      data: {
        userId: currentUser.id,
        userName: currentUser.name,
        status: 'online',
        lastSeen: Date.now()
      }
    });

    // Set up heartbeat to maintain presence
    const heartbeat = setInterval(() => {
      api.messaging.sendToAll({
        type: 'user-heartbeat',
        lifecycle: 'state',
        stateKey: 'heartbeat',
        data: {
          userId: currentUser.id,
          timestamp: Date.now()
        }
      });
    }, 30000); // Every 30 seconds

    return () => clearInterval(heartbeat);
  }, [api]);

  // Process presence messages
  useEffect(() => {
    const presenceMessages = messages.filter(msg => 
      msg.content.type === 'user-presence' ||
      msg.content.type === 'user-heartbeat' ||
      msg.content.type === 'cursor-position'
    );
    
    const users = new Map();
    const status = {};
    
    presenceMessages.forEach(msg => {
      const userId = msg.content.data.userId;
      
      if (msg.content.type === 'user-presence') {
        users.set(userId, {
          id: userId,
          name: msg.content.data.userName,
          status: msg.content.data.status,
          lastSeen: msg.content.data.lastSeen
        });
      } else if (msg.content.type === 'cursor-position') {
        status[userId] = {
          ...status[userId],
          isTyping: true,
          cursorPosition: msg.content.data.position
        };
      }
    });
    
    // Remove users who haven't sent heartbeat in 2 minutes
    const now = Date.now();
    const activeUsers = Array.from(users.values()).filter(user => 
      now - user.lastSeen < 120000
    );
    
    setOnlineUsers(activeUsers);
    setUserStatus(status);
  }, [messages]);

  const getUserAvatar = (user) => {
    return user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
  };

  const getUserStatusColor = (user) => {
    if (userStatus[user.id]?.isTyping) return 'typing';
    return user.status === 'online' ? 'online' : 'away';
  };

  return (
    <div className="user-presence">
      <h3>Team Members ({onlineUsers.length})</h3>
      
      <div className="users-list">
        {onlineUsers.map(user => (
          <div key={user.id} className="user-item">
            <div className="user-avatar">
              <img 
                src={getUserAvatar(user)} 
                alt={user.name}
                className="avatar-image"
              />
              <div 
                className={`status-indicator ${getUserStatusColor(user)}`}
                title={userStatus[user.id]?.isTyping ? 'Typing...' : user.status}
              />
            </div>
            
            <div className="user-info">
              <div className="user-name">{user.name}</div>
              <div className="user-status">
                {userStatus[user.id]?.isTyping ? (
                  <span className="typing">Typing...</span>
                ) : (
                  <span className="last-seen">
                    {formatTimeAgo(user.lastSeen)}
                  </span>
                )}
              </div>
            </div>
            
            {user.id === currentUser.id && (
              <div className="user-badge">You</div>
            )}
          </div>
        ))}
      </div>
      
      <div className="presence-controls">
        <button 
          onClick={() => setUserStatus('away')}
          className="status-button away"
        >
          Set Away
        </button>
        <button 
          onClick={() => setUserStatus('online')}
          className="status-button online"
        >
          Set Available
        </button>
      </div>
    </div>
  );
}
```

## Advanced Collaborative Features

### Conflict Resolution System

Handle simultaneous edits:

```tsx
function ConflictResolutionManager({ id }) {
  const api = useResourceAPI(id);
  const messages = api.messaging.getMessages();
  
  useEffect(() => {
    const conflictMessages = messages.filter(msg => 
      msg.content.type === 'edit-conflict'
    );
    
    conflictMessages.forEach(msg => {
      const { conflictId, versions } = msg.content.data;
      
      // Show conflict resolution UI
      showConflictDialog(conflictId, versions, (resolution) => {
        api.messaging.sendToAll({
          type: 'conflict-resolved',
          lifecycle: 'event',
          data: {
            conflictId,
            resolution,
            resolvedBy: currentUser.id,
            timestamp: Date.now()
          }
        });
      });
    });
  }, [messages, api]);

  return null; // Background conflict manager
}
```

### Permission Management

Role-based access control:

```tsx
function PermissionManager({ id }) {
  const api = useResourceAPI(id);
  const [userPermissions, setUserPermissions] = useState({});
  
  const checkPermission = (userId, action) => {
    const permissions = userPermissions[userId] || [];
    return permissions.includes(action) || permissions.includes('admin');
  };
  
  const grantPermission = (userId, permission) => {
    if (!checkPermission(currentUser.id, 'manage-permissions')) {
      throw new Error('Insufficient permissions');
    }
    
    api.messaging.sendToAll({
      type: 'permission-granted',
      lifecycle: 'state',
      stateKey: 'permissions',
      data: {
        userId,
        permission,
        grantedBy: currentUser.id,
        timestamp: Date.now()
      }
    });
  };
  
  return (
    <div className="permission-manager">
      {/* Permission management UI */}
    </div>
  );
}
```

## Best Practices for Collaborative Workflows

### 1. **Real-time Synchronization**
Use server-side storage for real-time collaboration:

```tsx
const collaborativePersistence = {
  storageAdapter: new HTTPStorageAdapter({
    baseUrl: 'https://api.myapp.com/realtime',
    headers: { 'Authorization': `Bearer ${token}` }
  }),
  autoSave: true,
  autoSaveDebounce: 200, // Fast sync for collaboration
  persistMessages: true
};
```

### 2. **Conflict Prevention**
Implement operational transformation:

```tsx
function applyOperation(content, operation) {
  // Transform operation based on concurrent changes
  const transformedOp = transformOperation(operation, concurrentOps);
  return applyTransformedOperation(content, transformedOp);
}
```

### 3. **Presence Awareness**
Always show who's online and what they're doing:

```tsx
function CollaborativeComponent({ id }) {
  const api = useResourceAPI(id);
  
  // Announce activity
  const announceActivity = (action) => {
    api.messaging.sendToAll({
      type: 'user-activity',
      lifecycle: 'event',
      data: { userId: currentUser.id, action, timestamp: Date.now() }
    });
  };
  
  return <div>{/* Component with activity tracking */}</div>;
}
```

### 4. **Graceful Degradation**
Handle offline scenarios:

```tsx
function OfflineCollaboration() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  if (!isOnline) {
    return <OfflineMode />;
  }
  
  return <OnlineCollaboration />;
}
```

The Linked Panels library provides excellent foundation for building sophisticated collaborative workflows with real-time synchronization, conflict resolution, and team coordination features. 