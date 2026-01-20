namespace :admin do
  def valid_roles
    %w[admin staff]
  end

  desc "管理者ユーザーを作成する"
  task :create_user, [:username, :password, :role] => :environment do |_t, args|
    username = args[:username]
    password = args[:password]
    role = args[:role] || "admin"

    if username.blank? || password.blank?
      puts "Usage: rake admin:create_user[username,password,role]"
      puts "  role: admin (default) または staff"
      exit 1
    end

    unless valid_roles.include?(role)
      puts "エラー: roleは #{valid_roles.join(' または ')} を指定してください。"
      exit 1
    end

    admin_user = AdminUser.create!(username: username, password: password, role: role)
    role_label = admin_user.admin? ? "管理者" : "スタッフ"
    puts "管理者ユーザー '#{admin_user.username}' (#{role_label}) を作成しました。"
  rescue ActiveRecord::RecordInvalid => e
    puts "エラー: #{e.message}"
    exit 1
  end

  desc "管理者ユーザーの権限を変更する"
  task :change_role, [:username, :new_role] => :environment do |_t, args|
    username = args[:username]
    new_role = args[:new_role]

    if username.blank? || new_role.blank?
      puts "Usage: rake admin:change_role[username,new_role]"
      puts "  new_role: #{valid_roles.join(' または ')}"
      exit 1
    end

    unless valid_roles.include?(new_role)
      puts "エラー: roleは #{valid_roles.join(' または ')} を指定してください。"
      exit 1
    end

    admin_user = AdminUser.find_by!(username: username)
    old_role_label = admin_user.admin? ? "管理者" : "スタッフ"
    admin_user.update!(role: new_role)
    new_role_label = admin_user.admin? ? "管理者" : "スタッフ"
    puts "'#{username}' の権限を #{old_role_label} から #{new_role_label} に変更しました。"
  rescue ActiveRecord::RecordNotFound
    puts "エラー: ユーザー '#{username}' が見つかりません。"
    exit 1
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
        role_label = admin_user.admin? ? "管理者" : "スタッフ"
        puts "  - #{admin_user.username} (#{role_label})"
      end
    end
  end
end
