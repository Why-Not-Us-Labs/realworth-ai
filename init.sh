#!/bin/bash

# RealWorth.ai - Project Initialization Script
# This script sets up the development environment for RealWorth.ai

set -e  # Exit on error

echo "🎯 Initializing RealWorth.ai Development Environment..."
echo ""

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "ℹ $1"
}

# Check if Node.js is installed
echo "Checking prerequisites..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi
print_success "Node.js $(node -v) detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm."
    exit 1
fi
print_success "npm $(npm -v) detected"

echo ""
echo "📦 Installing dependencies..."
npm install
print_success "Dependencies installed"

echo ""
echo "🔐 Setting up environment variables..."

# Check if .env.local exists
if [ -f .env.local ]; then
    print_warning ".env.local already exists. Skipping creation."
    echo ""
    print_info "Current environment variables:"
    cat .env.local | grep -v "^#" | grep -v "^$"
else
    # Create .env.local from template
    cat > .env.local << 'EOF'
# Google Gemini API Key
# Get your API key from: https://ai.google.dev/
GEMINI_API_KEY=""

# Google OAuth Client ID
# Get from: https://console.cloud.google.com/apis/credentials
NEXT_PUBLIC_GOOGLE_CLIENT_ID=""

# Google OAuth Client Secret (optional, not currently used)
GOOGLE_CLIENT_SECRET=""
EOF
    print_success "Created .env.local template"
    echo ""
    print_warning "IMPORTANT: You need to add your API keys to .env.local"
    echo ""
    print_info "Required API Keys:"
    echo "  1. GEMINI_API_KEY - Get from https://ai.google.dev/"
    echo "  2. NEXT_PUBLIC_GOOGLE_CLIENT_ID - Get from https://console.cloud.google.com/apis/credentials"
    echo ""
    print_info "Google OAuth Setup (https://console.cloud.google.com/apis/credentials):"
    echo "  1. Create OAuth 2.0 Client ID"
    echo "  2. Application type: Web application"
    echo "  3. Add Authorized JavaScript origins:"
    echo "     - http://localhost:3001"
    echo "  4. No redirect URIs needed (popup-based auth)"
    echo ""
fi

echo ""
echo "📝 Checking TypeScript configuration..."
if [ -f tsconfig.json ]; then
    print_success "TypeScript configuration found"
else
    print_warning "tsconfig.json not found. Running build to generate..."
    npm run build
fi

echo ""
echo "🎨 Checking Tailwind CSS configuration..."
if [ -f tailwind.config.ts ]; then
    print_success "Tailwind configuration found"
else
    print_error "tailwind.config.ts not found. Please ensure it exists."
fi

echo ""
echo "📂 Project structure check..."
REQUIRED_DIRS=("app" "components" "hooks" "lib" "services" "types")
for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        print_success "$dir/ exists"
    else
        print_warning "$dir/ not found - may cause issues"
    fi
done

echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check if .env.local is properly configured
if [ -f .env.local ]; then
    if grep -q 'GEMINI_API_KEY=""' .env.local || grep -q 'NEXT_PUBLIC_GOOGLE_CLIENT_ID=""' .env.local; then
        print_warning "Environment variables not configured yet"
        echo ""
        echo "Next steps:"
        echo "  1. Edit .env.local and add your API keys"
        echo "  2. Run: npm run dev"
        echo "  3. Open: http://localhost:3001"
    else
        print_success "Environment variables configured!"
        echo ""
        echo "🚀 Ready to start development!"
        echo ""
        echo "Run the development server:"
        echo "  npm run dev"
        echo ""
        echo "Open your browser:"
        echo "  http://localhost:3001"
        echo ""
        echo "Other commands:"
        echo "  npm run build  - Create production build"
        echo "  npm run start  - Run production build"
        echo "  npm run lint   - Run ESLint"
    fi
else
    print_error "Failed to create .env.local"
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""
print_success "Initialization complete!"
echo ""
echo "📚 Documentation:"
echo "  - Project docs: CLAUDE.md"
echo "  - Next.js docs: https://nextjs.org/docs"
echo "  - Gemini API: https://ai.google.dev/docs"
echo ""
print_info "Happy coding! 🎉"
