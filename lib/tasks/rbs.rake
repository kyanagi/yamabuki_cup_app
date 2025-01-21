begin
  require "rbs_rails/rake_task"

  # ActiveType でエラーになるのを回避するための workaround
  # rubocop:disable all
  module RbsRails
    class RakeTask
      def def_generate_rbs_for_models
        desc "Generate RBS files for Active Record models"
        task("#{name}:generate_rbs_for_models": :environment) do
          require "rbs_rails"

          Rails.application.eager_load!

          dep_builder = DependencyBuilder.new

          ::ActiveRecord::Base.descendants.each do |klass|
            # この下の2行で、元のコードと順番を入れ替えている。
            next if ignore_model_if&.call(klass)
            next unless RbsRails::ActiveRecord.generatable?(klass)

            path = signature_root_dir / "app/models/#{klass.name.underscore}.rbs"
            path.dirname.mkpath

            sig = RbsRails::ActiveRecord.class_to_rbs(klass, dependencies: dep_builder.deps)
            path.write sig
            dep_builder.done << klass.name
          end

          if dep_rbs = dep_builder.build
            signature_root_dir.join("model_dependencies.rbs").write(dep_rbs)
          end
        end
      end
    end
  end
  # rubocop:enable all

  RbsRails::RakeTask.new do |task|
    # If you want to avoid generating RBS for some classes, comment in it.
    # default: nil
    task.ignore_model_if = ->(klass) do
      # ActiveType::Object または ActiveType::Record[*] を継承したクラス。
      klass <= ActiveType::NestedAttributes
    end

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
  task setup: [:collection, :"rbs_rails:all", :inline]
  task update: [:"rbs_rails:all", :inline]
  task reset: [:clean, :setup]

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
