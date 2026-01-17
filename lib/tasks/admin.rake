namespace :admin do
  desc "管理者ユーザーを作成する"
  task :create_user, [:username, :password] => :environment do |_t, args|
    username = args[:username]
    password = args[:password]

    if username.blank? || password.blank?
      puts "Usage: rake admin:create_user[username,password]"
      exit 1
    end

    admin_user = AdminUser.create!(username: username, password: password)
    puts "管理者ユーザー '#{admin_user.username}' を作成しました。"
  rescue ActiveRecord::RecordInvalid => e
    puts "エラー: #{e.message}"
    exit 1
  end

  desc "管理者ユーザーのパスワードを変更する"
  task :change_password, [:username, :new_password] => :environment do |_t, args|
    username = args[:username]
    new_password = args[:new_password]

    if username.blank? || new_password.blank?
      puts "Usage: rake admin:change_password[username,new_password]"
      exit 1
    end

    admin_user = AdminUser.find_by!(username: username)
    admin_user.update!(password: new_password)
    puts "管理者ユーザー '#{username}' のパスワードを変更しました。"
  rescue ActiveRecord::RecordNotFound
    puts "エラー: ユーザー '#{username}' が見つかりません。"
    exit 1
  rescue ActiveRecord::RecordInvalid => e
    puts "エラー: #{e.message}"
    exit 1
  end

  desc "管理者ユーザー一覧を表示する"
  task list: :environment do
    admin_users = AdminUser.order(:username)
    if admin_users.empty?
      puts "管理者ユーザーが登録されていません。"
    else
      puts "管理者ユーザー一覧:"
      admin_users.each do |admin_user|
        puts "  - #{admin_user.username}"
      end
    end
  end
end
