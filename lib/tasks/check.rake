desc "Run all checks"
task :check do # rubocop:disable Rails/RakeEnvironment
  sh "npx", "biome", "check", "."
  sh "npx", "tsc", "--noEmit"
  sh "npm", "run", "test:run"
  sh "npm", "run", "lint:css"
  sh "bin/rubocop"
  # sh "bundle", "exec", "steep", "check"
  sh "bin/rails", "spec"
  sh "bin/brakeman", "--no-prism"
end
