# Contributing to UNITONE MCP Builder

Thank you for your interest in contributing to the UNITONE MCP Builder! This project is part of UNITONE's commitment to making enterprise AI workloads visible, controllable, and safe.

## 🚀 Getting Started

Before contributing, please read our [README.md](README.md) for project overview and basic setup instructions.

### Development Setup for Contributors

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/MCPBuilder.git
   cd MCPBuilder
   ```

2. **Add Upstream Remote**
   ```bash
   git remote add upstream https://github.com/UnitOneAI/MCPBuilder.git
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Start Development Environment**
   ```bash
   npm run dev
   ```
   Dashboard: `http://localhost:5173` | API: `http://localhost:3000`

5. **Keep Your Fork Updated**
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

## 🛠️ Development Guidelines

### Code Style

- Follow standard TypeScript conventions and React best practices
- Use meaningful variable and method names
- Include JSDoc documentation for public APIs
- Keep functions focused and concise (ideally < 50 lines)
- Use async/await for asynchronous operations

### Best Practices

- **Always validate input** using Zod schemas
- **Handle errors gracefully** with meaningful error messages
- **Use TypeScript types** consistently throughout
- **Test generated servers** to ensure they work correctly
- **Follow REST conventions** for API endpoints
- **Document breaking changes** clearly in PR descriptions

### Git Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the coding standards
   - Add tests for new functionality
   - Update documentation as needed

3. **Commit with clear messages**
   ```bash
   git commit -m "feat: add support for GraphQL API parsing"
   ```

4. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## 🧪 Testing

Before submitting code, ensure all checks pass:

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Formatting
npm run format

# Run tests
npm test
```

To test generated MCP servers:

```bash
cd generated-servers/your-server
npm install
npm run build
npm start
```

## 📝 Documentation

### Code Documentation

- Add JSDoc comments for all public functions
- Include parameter descriptions and return values
- Document any exceptions that may be thrown

```typescript
/**
 * Parses an OpenAPI specification and extracts API endpoints
 * @param spec - The OpenAPI specification object
 * @param baseUrl - The base URL for the API
 * @returns Parsed API configuration with endpoints
 * @throws {Error} If the specification is invalid
 */
export function parseOpenApiSpec(spec: OpenAPISpec, baseUrl: string): ApiConfig {
  // ...
}
```

### Documentation Requirements

When contributing, please update:
- **README.md** - If adding user-facing features
- **Code comments** - For complex logic
- **API documentation** - For new endpoints
- **Type definitions** - Keep them accurate and up-to-date

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Environment details** (Node.js version, OS, browser)
2. **Steps to reproduce** the issue
3. **Expected vs actual behavior**
4. **Error messages** and stack traces
5. **Sample API spec or configuration** if applicable

## 💡 Feature Requests

For new features, please:

1. **Check existing issues** to avoid duplicates
2. **Describe the use case** and business value
3. **Provide implementation suggestions** if you have them
4. **Consider backward compatibility**

## 🔒 Security

- **Never commit secrets** or API tokens
- **Use environment variables** for sensitive configuration
- **Follow least privilege principle** for API permissions
- **Report security issues** privately to security@unitone.ai

## 📋 Pull Request Checklist

Before submitting a PR, ensure:

- [ ] Code follows project style guidelines
- [ ] Type checking passes with `npm run type-check`
- [ ] Linting passes with `npm run lint`
- [ ] Code builds successfully with `npm run build`
- [ ] All tests pass with `npm test`
- [ ] Documentation is updated
- [ ] Commit messages follow conventional format
- [ ] No secrets or credentials in code
- [ ] PR description clearly explains changes

## 🌟 Recognition

Contributors will be:

- Added to the project's contributor list
- Mentioned in release notes for significant contributions
- Invited to join the UNITONE community Discord

## 📞 Support

- 🐛 **Bug reports**: [GitHub Issues](https://github.com/UnitOneAI/MCPBuilder/issues)
- 💬 **General questions**: [GitHub Discussions](https://github.com/UnitOneAI/MCPBuilder/discussions)
- 💬 **Community**: [UNITONE Discord](https://discord.gg/zA5zUe7Jqr)
- 🔒 **Security issues**: security@unitone.ai
- 📧 **Contact**: [UnitOne AI](https://unitone.ai)

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for helping make API-to-MCP generation more accessible and automated! 🚀
