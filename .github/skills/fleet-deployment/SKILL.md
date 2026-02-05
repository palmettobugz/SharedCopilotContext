# Fleet Deployment Skill

**Version:** 1.0.0

## Overview

This skill teaches agents how to deploy services across the Star Force constellation of machines.

## Constellation Topology

| Station | Hostname | IP | Role |
|---------|----------|-----|------|
| Star Force One | sf1 / star-force-one.local | 192.168.4.3 | Bridge - Strategic Operations |
| Star Force Two | sf2 | 192.168.4.4 | Desktop - Development |
| Star Force Three | sf3 | 192.168.4.5 | Engineering - Backend Operations |

## Station Responsibilities

### Star Force One (sf1) - Bridge
- Dashboard, Frontend Services
- User Interfaces
- System monitoring and health checks

### Star Force Three (sf3) - Engineering
- Backend Services
- Databases
- Application Logic

## Key Services

| Service | URL | Description |
|---------|-----|-------------|
| Household-ERP | http://star-force-one.local:8000 | Garden center operations (Docker on sf1) |
| Starbog MUD | http://localhost:4001 | Astrology-learning game |
| COMMS API | http://star-force-one.local:5052 | Inter-agent communication |

## Deployment Workflow

1. **Verify target station** - Confirm connectivity to target
2. **Check prerequisites** - Ensure dependencies are met
3. **Deploy files** - Copy files to target location
4. **Configure service** - Set up configuration
5. **Health check** - Verify service is running
6. **Report status** - Use COMMS to announce completion

## Health Check Protocol

When performing health checks:

```
🌟 Project Starlight Health Check
Station: [sf1/sf3]
Role: [monitor/oracle/developer/spec]

COMMON STATUS:
✅ Household-ERP: 302 OK (auth)
✅ Starbog: 200 OK
✅ COMMS: 200 OK

Checked at: [timestamp]
```

## SSH Access Patterns

```bash
# Connect to Star Force One
ssh sf1

# Connect to Star Force Three  
ssh sf3

# Deploy files
scp -r ./dist/* sf3:/path/to/target/
```

## Docker Deployments (sf1)

```bash
# Deploy to Docker on sf1
ssh sf1 "cd /path/to/project && docker-compose up -d"

# Check container status
ssh sf1 "docker ps --format 'table {{.Names}}\t{{.Status}}'"
```
