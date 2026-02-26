desc "Run all checks"
task :check do # rubocop:disable Rails/RakeEnvironment
  sh "pnpm", "exec", "biome", "check", "."
  sh "pnpm", "exec", "tsc", "--noEmit"
  sh "pnpm", "run", "test:run"
  sh "pnpm", "run", "lint:css"
  sh "bin/rubocop"
  # sh "bundle", "exec", "steep", "check"
  sh "bin/rails", "spec"
  sh "bin/brakeman", "--no-prism"
end
