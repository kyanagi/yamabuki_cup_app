# 試合のルールの基底となるクラス。
#
# process_* でスコアを更新するときは、このクラスでは Score は save しない。
# （ScoreOperation 側から save されるため）
module MatchRule
  class Base
    # @rbs @match: Match
    # @rbs @scores: Array[Score]

    # @rbs match: Match
    def initialize(match)
      @match = match
      @scores = @match.current_scores
    end

    # 問題ごとの締め処理を行い、得点を更新する。
    # @rbs score_operation: QuestionClosing
    # @rbs question_player_results: Array[QuestionPlayerResult]
    # @rbs return: void
    def process_question_closing(score_operation, question_player_results)
      raise NotImplementedError
    end

    # 試合終了の処理を行う。
    # @rbs score_operation: MatchClosing
    # @rbs return: void
    def process_match_closing(score_operation)
      @score_operation = score_operation
      prepare_new_scores(score_operation)
      judge_on_quiz_completed
    end

    # 試合開始時のスコアの初期値を返す。
    # @rbs seat: Integer
    # @rbs return: Hash[Symbol, untyped]
    def initial_score_attributes_of(seat)
      { status: initial_status_of(seat), points: initial_points_of(seat), misses: initial_misses_of(seat) }
    end

    # @rbs return: String
    def progress_summary
      num_winners = @scores.count(&:status_win?)
      num_winners_left = self.class::NUM_WINNERS - num_winners
      "#{self.class::NUM_SEATS}→#{self.class::NUM_WINNERS}／現在#{num_winners}人勝ち抜け、残り#{num_winners_left}人"
    end

    # 引数で与えられた ScoreOperation を要約した文字列を返す。
    # @rbs score_operation: ScoreOperation
    # @rbs return: String
    def summarize_score_operation(score_operation)
      case score_operation
      when MatchClosing
        "限定問題終了判定"
      when MatchOpening
        "試合開始"
      when Disqualification
        "敗退: #{score_operation.player.player_profile.family_name}"
      when SetTransition
        "新セット開始"
      when ScoreFreeEditOperation
        "自由編集"
      else
        score_operation.class.name
      end
    end

    private

    # スコア更新に向けて、新しいScoreオブジェクトを作成する。
    # @rbs score_operation: QuestionClosing
    # @rbs return: void
    def prepare_new_scores(score_operation)
      previous_scores = @match.current_scores.map do |score|
        # dup によって、id が nil の新しいオブジェクトが作成される。
        # dup だけだと preload していても N+1 問題が発生するため、matching は明示的にコピーする。
        score.dup.tap do |s|
          s.matching = score.matching
        end
      end
      score_operation.scores = @scores = previous_scores
    end

    # 問題限定終了時の順位判定を行う。
    # @rbs return: void
    def judge_on_quiz_completed
      raise NotImplementedError
    end

    # 試合開始時のステータスの初期値を返す。
    # @rbs (Integer) -> String
    def initial_status_of(_seat)
      "playing"
    end

    # 試合開始時の得点の初期値を返す。
    # @rbs (Integer) -> Integer
    def initial_points_of(_seat)
      0
    end

    # 試合開始時の誤答数の初期値を返す。
    # @rbs (Integer) -> Integer
    def initial_misses_of(_seat)
      0
    end
  end
end
