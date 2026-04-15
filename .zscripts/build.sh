#!/bin/bash

# 将 stderr 重定向到 stdout
exec 2>&1

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NEXTJS_PROJECT_DIR="/home/z/my-project"

if [ ! -d "$NEXTJS_PROJECT_DIR" ]; then
    echo "❌ 错误: Next.js 项目目录不存在: $NEXTJS_PROJECT_DIR"
    exit 1
fi

echo "🚀 开始构建 BiblioPWA..."
echo "📁 项目路径: $NEXTJS_PROJECT_DIR"

cd "$NEXTJS_PROJECT_DIR" || exit 1

export NEXT_TELEMETRY_DISABLED=1
# Forzar DATABASE_URL a Neon PostgreSQL (el sistema puede tener SQLite)
export DATABASE_URL="postgresql://neondb_owner:npg_57VcFePMvpBj@ep-cold-cake-antffgy6.c-6.us-east-1.aws.neon.tech/neondb"

BUILD_DIR="/tmp/build_fullstack_$BUILD_ID"
echo "📁 清理并创建构建目录: $BUILD_DIR"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# 安装依赖
echo "📦 安装依赖..."
npm install

# 生成 Prisma Client (para PostgreSQL)
echo "🔧 生成 Prisma Client (PostgreSQL)..."
npx prisma generate

# 构建 Next.js 应用
echo "🔨 构建 Next.js 应用..."
npm run build

# 构建 mini-services (si existe)
if [ -d "$NEXTJS_PROJECT_DIR/mini-services" ]; then
    echo "🔨 构建 mini-services..."
    sh "$SCRIPT_DIR/mini-services-install.sh"
    sh "$SCRIPT_DIR/mini-services-build.sh"
    echo "  - 复制 mini-services-start.sh 到 $BUILD_DIR"
    cp "$SCRIPT_DIR/mini-services-start.sh" "$BUILD_DIR/mini-services-start.sh"
    chmod +x "$BUILD_DIR/mini-services-start.sh"
else
    echo "ℹ️  mini-services 目录不存在，跳过"
fi

# 收集构建产物
echo "📦 收集构建产物到 $BUILD_DIR..."

# 复制 Next.js standalone 构建输出
if [ -d ".next/standalone" ]; then
    echo "  - 复制 .next/standalone"
    cp -r .next/standalone "$BUILD_DIR/next-service-dist/"
else
    echo "❌ 未找到 .next/standalone 目录"
    exit 1
fi

# 复制 Next.js 静态文件
if [ -d ".next/static" ]; then
    echo "  - 复制 .next/static"
    mkdir -p "$BUILD_DIR/next-service-dist/.next"
    cp -r .next/static "$BUILD_DIR/next-service-dist/.next/"
fi

# 复制 public 目录
if [ -d "public" ]; then
    echo "  - 复制 public"
    cp -r public "$BUILD_DIR/next-service-dist/"
fi

# Neon PostgreSQL - NO se necesita SQLite
echo "🗄️  Usando Neon PostgreSQL (base de datos en la nube)"

# Copiar .env con Neon URL al build
if [ -f ".env" ]; then
    echo "  - 复制 .env"
    cp .env "$BUILD_DIR/next-service-dist/.env"
fi

# Copiar Prisma Client al standalone
if [ -d "node_modules/.prisma" ]; then
    echo "  - 复制 Prisma Client"
    mkdir -p "$BUILD_DIR/next-service-dist/node_modules/.prisma"
    cp -r node_modules/.prisma "$BUILD_DIR/next-service-dist/node_modules/"
    mkdir -p "$BUILD_DIR/next-service-dist/node_modules/@prisma"
    cp -r node_modules/@prisma/client "$BUILD_DIR/next-service-dist/node_modules/@prisma/"
fi

# Copiar Caddyfile
if [ -f "Caddyfile" ]; then
    echo "  - 复制 Caddyfile"
    cp Caddyfile "$BUILD_DIR/"
fi

# Copiar start.sh
echo "  - 复制 start.sh 到 $BUILD_DIR"
cp "$SCRIPT_DIR/start.sh" "$BUILD_DIR/start.sh"
chmod +x "$BUILD_DIR/start.sh"

# 打包
PACKAGE_FILE="${BUILD_DIR}.tar.gz"
echo ""
echo "📦 打包构建产物到 $PACKAGE_FILE..."
cd "$BUILD_DIR" || exit 1
tar -czf "$PACKAGE_FILE" .
cd - > /dev/null || exit 1

echo ""
echo "✅ 构建完成！所有产物已打包到 $PACKAGE_FILE"
echo "📊 打包文件大小:"
ls -lh "$PACKAGE_FILE"
