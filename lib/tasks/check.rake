desc "Run all checks"
task :check do # rubocop:disable Rails/RakeEnvironment
  sh "pnpm", "run", "fmt:check"
  sh "pnpm", "run", "lint"
  sh "pnpm", "run", "lint:css"
  sh "pnpm", "run", "test:run"
  sh "bin/rubocop"
  # sh "bundle", "exec", "steep", "check"
  sh "bin/rails", "spec"
  sh "bin/brakeman", "--no-prism"
end
