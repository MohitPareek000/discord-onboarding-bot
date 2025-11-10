# Use official Node.js 20 Alpine image for smaller size
FROM node:20-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Set working directory
WORKDIR /app

# Copy dependency files (ensure both files exist in project root)
COPY package.json ./
COPY package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev && \
    npm cache clean --force

# Create non-root user before copying files
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy application source code with correct ownership
COPY --chown=nodejs:nodejs index.js generate-invite-url.js ./
COPY --chown=nodejs:nodejs utils/ ./utils/

# Switch to non-root user for security
USER nodejs

# Expose port for health checks (optional)
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the Discord bot
CMD ["node", "index.js"]
