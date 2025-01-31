desc "Run all checks"
task :checkall do # rubocop:disable Rails/RakeEnvironment
  sh "bin/rubocop"
  sh "bundle", "exec", "steep", "check"
  sh "bin/rails", "spec"
  sh "bin/brakeman"
end
