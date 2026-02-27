module Scoreboard
  class MatchSerializer
    GRID_CLASS_MAP = {
      "board" => "match-scorelist-column1",
      "hayaoshi" => "match-scorelist-column1",
      "hayabo" => "match-scorelist-column1",
      "final" => "match-scorelist-column1",
      "round2" => "match-scorelist-column2",
      "playoff" => "match-scorelist-column2-row5",
    }.freeze

    # name に scoreboard_full_name ではなく family_name を使うルール
    FAMILY_NAME_TEMPLATES = %w[round2 playoff].freeze

    # @rbs match: Match
    # @rbs scores: Array[Score]
    # @rbs score_operation: ScoreOperation?
    def initialize(match, scores, score_operation)
      @match = match
      @scores = scores
      @score_operation = score_operation
    end

    # @rbs return: Hash[Symbol, untyped]
    def as_json
      rule_template = @match.rule_class::ADMIN_VIEW_TEMPLATE

      {
        matchId: @match.id,
        ruleTemplate: rule_template,
        gridClass: GRID_CLASS_MAP.fetch(rule_template, "match-scorelist-column1"),
        footerLabel: @match.full_name,
        scoreOperationId: @score_operation&.id,
        scores: @scores.map { |score| serialize_score(score, rule_template) },
      }
    end

    private

    # @rbs score: Score
    # @rbs rule_template: String
    # @rbs return: Hash[Symbol, untyped]
    def serialize_score(score, rule_template)
      profile = score.matching.player.player_profile
      name = if FAMILY_NAME_TEMPLATES.include?(rule_template)
               profile.family_name
             else
               profile.scoreboard_full_name
             end

      {
        matchingId: score.matching_id,
        seat: score.matching.seat,
        playerId: score.matching.player_id,
        name:,
        nameLength: name.size,
        status: score.status,
        points: score.points,
        misses: score.misses,
        rank: score.rank,
        stars: score.attributes.key?("stars") ? score.stars : 0,
        scoreChanged: score.score_changed?,
        previousResult: previous_result(score.matching.player_id),
        previousSituation: previous_situation(score.matching.player_id, rule_template),
      }
    end

    # @rbs player_id: Integer
    # @rbs return: String?
    def previous_result(player_id)
      qpr = find_question_player_result(player_id)
      return nil unless qpr

      case rule_of_score_operation
      when "hayabo"
        if qpr.situation_pushed? || qpr.result_correct?
          qpr.result
        end
      else
        if qpr.situation_pushed?
          qpr.result
        end
      end
    end

    # @rbs player_id: Integer
    # @rbs rule_template: String
    # @rbs return: String?
    def previous_situation(player_id, rule_template)
      return nil unless rule_template == "hayabo"

      qpr = find_question_player_result(player_id)
      qpr&.situation
    end

    # @rbs player_id: Integer
    # @rbs return: QuestionPlayerResult?
    def find_question_player_result(player_id)
      return nil unless @score_operation

      @score_operation.question_result&.question_player_results&.find { it.player_id == player_id }
    end

    # @rbs return: String
    def rule_of_score_operation
      @match.rule_class::ADMIN_VIEW_TEMPLATE
    end
  end
end
