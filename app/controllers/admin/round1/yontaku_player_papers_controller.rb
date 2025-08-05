module Admin
  module Round1
    class YontakuPlayerPapersController < AdminController
      def index
        @upload = YontakuResultUpload.new
        setup_index_instance_variables
      end

      def create
        csv_content = params.dig(:yontaku_result_upload, :csv_file)&.read
        if csv_content.blank?
          flash.now.alert = "CSVファイルが選択されていません。"
          @upload = YontakuResultUpload.new
          @players = Player.preload(:yontaku_player_papers).order(:id)
          render :index, status: 422
          return
        end

        @upload = YontakuResultUpload.new(csv_data: csv_content)

        if @upload.save
          flash.notice = "#{@upload.imported_lines_count}件のデータをインポートしました。"
          flash.alert = @upload.error_lines.join("\n") if @upload.error_lines.present?
          redirect_to new_admin_round1_yontaku_player_paper_path
        else
          flash.now.alert = @upload.errors.full_messages.join(", ")
          setup_index_instance_variables
          render :index, status: 422
        end
      end

      def destroy_all
        YontakuPlayerPaper.destroy_all
        flash.notice = "全ての解答用紙を削除しました。"
        redirect_to admin_round1_yontaku_player_papers_path
      end

      private

      def setup_index_instance_variables
        @players = Player.eager_load(:player_profile, :yontaku_player_papers).order(:id)
        @players_count_by_paper_count = @players.group_by { it.yontaku_player_papers.size }.transform_values(&:size)
        @players_count_by_paper_count.default = 0
        @paper_count = @players.sum { it.yontaku_player_papers.size }
      end
    end
  end
end
