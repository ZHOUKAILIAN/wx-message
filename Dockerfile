FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制源代码
COPY . .

# 安装 tsx
RUN npm install -g tsx

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["npm", "start"]
