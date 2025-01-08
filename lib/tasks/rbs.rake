begin
  require "rbs_rails/rake_task"

  RbsRails::RakeTask.new do |task|
    # If you want to avoid generating RBS for some classes, comment in it.
    # default: nil
    #
    # task.ignore_model_if = -> (klass) { klass == MyClass }

    # If you want to change the rake task namespace, comment in it.
    # default: :rbs_rails
    # task.name = :cool_rbs_rails

    # If you want to change where RBS Rails writes RBSs into, comment in it.
    # default: Rails.root / 'sig/rbs_rails'
    # task.signature_root_dir = Rails.root / 'my_sig/rbs_rails'
  end
rescue LoadError
  # failed to load rbs_rails. Skip to load rbs_rails tasks.
end

namespace :rbs do
  task setup: %i[collection rbs_rails:all inline]
  task update: %i[rbs_rails:all inline]
  task reset: %i[clean setup]

  task :collection do # rubocop:disable Rails/RakeEnvironment
    sh "rbs", "collection", "install"
  end

  task :inline do # rubocop:disable Rails/RakeEnvironment
    sh "rbs-inline", "--output", "--opt-out", "app", "lib"
  end

  task :clean do # rubocop:disable Rails/RakeEnvironment
    sh "rm", "-rf", ".gem_rbs_collection", "sig/rbs_rails", "sig/generated"
  end
end
