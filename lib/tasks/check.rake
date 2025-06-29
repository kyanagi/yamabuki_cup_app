desc "Run all checks"
task :check do # rubocop:disable Rails/RakeEnvironment
  sh "npx", "biome", "check", "."
  sh "bin/rubocop"
  sh "bundle", "exec", "steep", "check"
  sh "bin/rails", "spec"
  sh "bin/brakeman", "--no-prism"
end
