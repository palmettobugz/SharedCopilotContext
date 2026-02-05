---
applyTo: "**/deploy/**,**/scripts/deploy*"
---

# Deployment Instructions

## Star Force Constellation Targets

| Station | Hostname | Role |
|---------|----------|------|
| sf1 | star-force-one.local | Bridge - Strategic |
| sf2 | 192.168.4.4 | Desktop - Development |
| sf3 | 192.168.4.5 | Engineering - Backend |

## Deployment Checklist

1. **Pre-flight**
   - Verify target is reachable: `ssh <host> echo ok`
   - Check disk space: `ssh <host> df -h /`
   - Verify Node.js version: `ssh <host> node --version`

2. **Deploy**
   - Use rsync for file sync: `rsync -avz --delete ./dist/ <host>:/path/`
   - Set permissions: `ssh <host> chmod +x /path/to/bin/*`

3. **Post-Deploy**
   - Run health check
   - Verify service responds
   - Report to COMMS

## Health Check Patterns

```bash
# HTTP service check
curl -s -o /dev/null -w "%{http_code}" http://<host>:<port>/

# Docker service check  
ssh <host> "docker ps --format '{{.Names}}: {{.Status}}' | grep <service>"

# Process check
ssh <host> "pgrep -f '<process-name>'"
```

## COMMS Reporting

Always report deployments:
```
🚀 Starting: <deployment name>
📊 Progress: <percentage>
✅ Complete: <result>
```
