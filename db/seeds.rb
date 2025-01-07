# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Example:
#
#   ["Action", "Comedy", "Drama", "Horror"].each do |genre_name|
#     MovieGenre.find_or_create_by!(name: genre_name)
#   end

[
  { id: 21, name: "2R Group 1", round_id: 2, rule_name: "RoundRule::Round2" },
  { id: 22, name: "2R Group 2", round_id: 2, rule_name: "RoundRule::Round2" },
  { id: 23, name: "2R Group 3", round_id: 2, rule_name: "RoundRule::Round2" },
  { id: 24, name: "2R Group 4", round_id: 2, rule_name: "RoundRule::Round2" },
  { id: 25, name: "2R Group 5", round_id: 2, rule_name: "RoundRule::Round2" },
  { id: 31, name: "3R Course A", round_id: 3, rule_name: "RoundRule::Round3Hayaoshi73" },
  { id: 32, name: "3R Course B", round_id: 4, rule_name: "RoundRule::Round3Hayaoshi71" },
].each do |match_attr|
  m = Match.find_or_initialize_by(id: match_attr[:id])
  m.update!(match_attr)
end
