# 🏗️ DailyCodeDeploy Architecture Guide

## 📐 Overall Architecture

DailyCodeDeploy is built as a modular, scalable system with emphasis on simplicity and security.

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway   │    │   GitHub API    │
│   (Static)      │◄──►│   (Express.js)  │◄──►│   (OAuth)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Job Queue     │◄──►│   Core Engine   │◄──►│   File System   │
│   (Redis opt.)  │    │   (Node.js)     │    │   (Temp/Logs)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Pipeline      │
                       │   Executor      │
                       │   (Shell/Docker)│
                       └─────────────────┘
```

## 🧩 System Components

### Frontend Layer

#### Static Web Interface
**Technologies**: HTML5, CSS3, Vanilla JavaScript
**Location**: `/frontend/`

```
frontend/
├── index.html          # Main page
├── benefits.md         # About project (Jekyll)
├── _config.yml         # Jekyll configuration
└── assets/
    ├── styles.css      # Interface styles
    └── script.js       # Client logic
```

**Features**:
- Fully static (GitHub Pages compatible)
- Responsive design
- Progressive enhancement
- Minimal dependencies

### Backend Layer

#### API Server
**Technologies**: Node.js, Express.js
**Location**: `/backend/`

```
backend/
├── server.js           # HTTP server and routing
├── queue.js            # Queue system
├── runner.js           # Pipeline executor
├── package.json        # Dependencies
├── .env.example        # Environment template
└── data/
    └── users.json      # Temp user storage
```

#### Main Endpoints

```javascript
// API Routes
GET  /api/repos                 // Repository list
POST /api/pipeline/run          // Run pipeline
GET  /api/pipeline/status/:id   // Execution status
POST /api/auth/github           // GitHub OAuth
GET  /api/logs/:id              // Execution logs
```

### Data Layer

#### Temporary Storage (MVP)
**Current State**: JSON files
**Planned**: PostgreSQL/MongoDB

```json
// users.json structure
{
  "users": [
    {
      "id": "user123",
      "github_token": "encrypted_token",
      "username": "developer",
      "repositories": ["repo1", "repo2"],
      "last_login": "2025-09-23T10:00:00Z"
    }
  ]
}
```

#### Logging
**System**: Built-in logging + planned ELK Stack

```javascript
// Log structure
{
  "timestamp": "2025-09-23T10:00:00Z",
  "level": "info|warn|error",
  "component": "api|queue|runner",
  "user_id": "user123",
  "action": "pipeline_start",
  "metadata": {
    "repository": "user/repo",
    "pipeline_id": "pip_123"
  }
}
```

## ⚙️ Pipeline Execution Engine

### Workflow Architecture

```
GitHub Webhook/Manual → Queue → Executor → Results
     │                   │         │         │
     ▼                   ▼         ▼         ▼
  Validation        Job Storage  Sandboxed  Logs &
  & Auth           & Scheduling  Execution  Cleanup
```

### Execution Flow

1. **Request Validation**
   ```javascript
   function validatePipelineRequest(req) {
     // Auth check
     // Input sanitization
     // Resource limits check
     return validation_result;
   }
   ```

2. **Job Queuing**
   ```javascript
   const job = {
     id: generateId(),
     user_id: req.user.id,
     repository: req.body.repo,
     steps: sanitizeSteps(req.body.steps),
     created_at: new Date(),
     status: 'queued'
   };
   await queue.add(job);
   ```

3. **Execution Environment**
   ```bash
   # Sandboxed execution
   mkdir -p /tmp/pipeline_${JOB_ID}
   cd /tmp/pipeline_${JOB_ID}
   
   # Clone repository
   git clone ${REPO_URL} .
   
   # Execute steps
   for step in "${STEPS[@]}"; do
     timeout 300s bash -c "$step"
   done
   ```

4. **Results Collection**
   ```javascript
   const result = {
     job_id: job.id,
     status: 'success|failed|timeout',
     output: capturedOutput,
     error: capturedError,
     duration: executionTime,
     completed_at: new Date()
   };
   ```

## 🔧 Configuration Management

### Environment Variables

```bash
# Core settings
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# GitHub Integration
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_secret
GITHUB_REDIRECT_URI=http://localhost:5000/auth/callback

# Security
SESSION_SECRET=random_secure_string
ENCRYPTION_KEY=32_byte_encryption_key

# Optional: Redis Queue
REDIS_URL=redis://localhost:6379

# Execution Limits
MAX_EXECUTION_TIME=300
MAX_CONCURRENT_JOBS=10
MAX_LOG_SIZE=1048576
```

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app

# Security: non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Dependencies
COPY package*.json ./
RUN npm ci --only=production

# Application code
COPY --chown=nodejs:nodejs . .
USER nodejs

EXPOSE 5000
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
    volumes:
      - ./logs:/app/logs
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  redis_data:
```

## 📊 Monitoring & Observability

### Health Checks

```javascript
// /api/health endpoint
app.get('/api/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date(),
    version: process.env.npm_package_version,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    load: {
      queue_size: queue.size(),
      active_jobs: runner.activeJobs(),
      cpu_usage: os.loadavg()
    }
  };
  
  res.json(health);
});
```

### Metrics Collection

```javascript
// Prometheus metrics (planned)
const promClient = require('prom-client');

const metrics = {
  http_requests: new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'status']
  }),
  
  pipeline_duration: new promClient.Histogram({
    name: 'pipeline_duration_seconds',
    help: 'Pipeline execution duration'
  }),
  
  active_pipelines: new promClient.Gauge({
    name: 'active_pipelines',
    help: 'Currently running pipelines'
  })
};
```

## 🔒 Security Architecture

### Authentication Flow

```
User → GitHub OAuth → Access Token → API Requests
  │         │            │              │
  ▼         ▼            ▼              ▼
Browser  GitHub API   Session Store  Protected
         Callback     (Memory/Redis)  Resources
```

### Authorization Model

```javascript
// Permission-based access
const permissions = {
  'repo:read': ['public_repo'],
  'repo:write': ['repo'],
  'admin': ['admin:org']
};

function checkPermission(user, action, resource) {
  const required = permissions[action];
  const granted = user.github_scopes;
  return required.some(scope => granted.includes(scope));
}
```

### Input Sanitization

```javascript
// Command sanitization pipeline
function sanitizeCommand(input) {
  // 1. Remove dangerous characters
  const cleaned = input.replace(/[;&|`$(){}[\]]/g, '');
  
  // 2. Whitelist allowed commands
  const allowedCommands = ['npm', 'git', 'echo', 'ls', 'pwd'];
  const firstWord = cleaned.split(' ')[0];
  
  if (!allowedCommands.includes(firstWord)) {
    throw new Error('Command not allowed');
  }
  
  // 3. Length limits
  if (cleaned.length > 1000) {
    throw new Error('Command too long');
  }
  
  return cleaned;
}
```

## 🚀 Deployment Architecture

### Local Development

```bash
# Development setup
git clone https://github.com/NickScherbakov/daily-code-deploy.git
cd daily-code-deploy

# Install dependencies
npm install
cd backend && npm install && cd ..

# Start development server
npm run dev  # Watches for changes
```

### Production Deployment

#### Option 1: Docker Compose
```bash
# Production with Docker
docker-compose up -d
```

#### Option 2: PM2 (Node.js)
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start backend/server.js --name "daily-code-deploy"
pm2 startup
pm2 save
```

#### Option 3: Kubernetes (planned)
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: daily-code-deploy
spec:
  replicas: 3
  selector:
    matchLabels:
      app: daily-code-deploy
  template:
    metadata:
      labels:
        app: daily-code-deploy
    spec:
      containers:
      - name: app
        image: daily-code-deploy:latest
        ports:
        - containerPort: 5000
        env:
        - name: NODE_ENV
          value: "production"
```

## 📈 Scaling Considerations

### Horizontal Scaling

```
Load Balancer (nginx/HAProxy)
      │
      ├── App Instance 1 ─┐
      ├── App Instance 2 ─┤── Shared Redis Queue
      └── App Instance 3 ─┘
                          │
                     Database Cluster
```

### Performance Optimization

```javascript
// Connection pooling
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Caching layer
const cache = new Redis({
  host: process.env.REDIS_HOST,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
});
```

### Resource Management

```javascript
// Pipeline resource limits
const limits = {
  maxConcurrentPipelines: 50,
  maxPipelineDuration: 600, // 10 minutes
  maxOutputSize: 1024 * 1024, // 1MB
  maxCpuUsage: 80, // percent
  maxMemoryUsage: 512 * 1024 * 1024 // 512MB
};
```

## 🛠️ Development Guidelines

### Code Structure

```
src/
├── controllers/        # Request handlers
├── middleware/         # Express middleware
├── services/          # Business logic
├── models/            # Data models
├── utils/             # Helper functions
├── config/            # Configuration
└── tests/             # Test suites
```

### Testing Strategy

```javascript
// Unit tests
describe('Pipeline Controller', () => {
  test('should validate input correctly', () => {
    // Test implementation
  });
});

// Integration tests
describe('API Endpoints', () => {
  test('POST /api/pipeline/run', async () => {
    // Test full request flow
  });
});

// End-to-end tests
describe('Complete Pipeline Flow', () => {
  test('should execute pipeline successfully', async () => {
    // Test complete user journey
  });
});
```

### Contribution Workflow

```bash
# Development workflow
git checkout main
git pull origin main
git checkout -b feature/new-feature

# Development work
npm test
npm run lint
npm run build

# Submit changes
git commit -m "feat: add new feature"
git push origin feature/new-feature
# Create Pull Request
```

---

**Document Version**: 1.0  
**Last Updated**: September 23, 2025  
**Status**: Living document - regularly updated 📋