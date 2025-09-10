# Cross-Panel Communication Signal Debugging

## 🎯 Log Filters for Dev Tools

Use these filters in Chrome DevTools Console to isolate specific logs:

### All Cross-Panel Signals
```
🎯
```

### Message Handler Activity
```
MESSAGE_HANDLER_
```

### Highlight Signals Received
```
HIGHLIGHT_SIGNAL_RECEIVED
```

### Tokens Being Highlighted Per Panel
```
HIGHLIGHT_TOKENS_FOR_
```

### Clear Signals
```
CLEAR_SIGNAL_RECEIVED
```

### Specific Panel Activity
```
🎯 MESSAGE_HANDLER_ult-scripture
🎯 MESSAGE_HANDLER_ust-scripture
```

## 📋 Expected Log Flow

When you click "gobierno" in ULT, you should see:

### 1. Cross-Panel Service Logs
```
🖱️ Word clicked: "gobierno" in ult-scripture
🔍 Finding tokens aligned to same source as: gobierno
✅ Found matching token: "de" in ult-scripture
✅ Found matching token: "los" in ult-scripture  
✅ Found matching token: "gobierno" in ult-scripture
✅ Found matching token: "gobernaban" in ust-scripture
📡 Broadcasting message: {...}
```

### 2. ULT Panel Receives Signal
```
🎯 MESSAGE_HANDLER_ult-scripture: {messageType: "HIGHLIGHT_TOKENS", ...}
🎯 HIGHLIGHT_SIGNAL_RECEIVED in ult-scripture: {
  sourceResourceId: "ult-scripture",
  sourceContent: "gobierno", 
  totalAlignedTokens: 4,
  alignedTokens: [...]
}
🎯 HIGHLIGHT_TOKENS_FOR_ult-scripture: {
  tokensForThisPanel: ["rut 1:1:de:1", "rut 1:1:los:2", "rut 1:1:gobierno:1"],
  willHighlight: true
}
```

### 3. UST Panel Receives Signal  
```
🎯 MESSAGE_HANDLER_ust-scripture: {messageType: "HIGHLIGHT_TOKENS", ...}
🎯 HIGHLIGHT_SIGNAL_RECEIVED in ust-scripture: {
  sourceResourceId: "ult-scripture",
  sourceContent: "gobierno",
  totalAlignedTokens: 4, 
  alignedTokens: [...]
}
🎯 HIGHLIGHT_TOKENS_FOR_ust-scripture: {
  tokensForThisPanel: ["rut 1:1:gobernaban:1"],
  willHighlight: true
}
```

## 🐛 Debugging Issues

### If self-highlighting not working:
- Check if ULT panel receives `HIGHLIGHT_SIGNAL_RECEIVED`
- Check if `tokensForThisPanel` contains expected token IDs
- Check if `willHighlight: true`

### If cross-highlighting not working:
- Check if UST panel receives `HIGHLIGHT_SIGNAL_RECEIVED` 
- Check if `alignedTokens` contains tokens for both panels
- Check if message broadcasting is working

### If no signals at all:
- Check if `MESSAGE_HANDLER_` logs appear for both panels
- Check panel registration logs
- Check if click triggers cross-panel service

