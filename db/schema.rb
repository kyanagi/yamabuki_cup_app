# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2025_01_07_141028) do
  create_table "matches", force: :cascade do |t|
    t.integer "round_id", null: false
    t.string "name", default: "", null: false
    t.string "rule_name", default: "", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "matchings", force: :cascade do |t|
    t.integer "match_id", null: false
    t.integer "player_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["match_id", "player_id"], name: "index_matchings_on_match_id_and_player_id", unique: true
    t.index ["match_id"], name: "index_matchings_on_match_id"
    t.index ["player_id"], name: "index_matchings_on_player_id"
  end

  create_table "players", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "question_allocations", force: :cascade do |t|
    t.integer "match_id", null: false
    t.integer "question_id", null: false
    t.integer "order", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["match_id", "order"], name: "index_question_allocations_on_match_id_and_order", unique: true
    t.index ["match_id"], name: "index_question_allocations_on_match_id"
    t.index ["question_id"], name: "index_question_allocations_on_question_id", unique: true
  end

  create_table "question_player_results", force: :cascade do |t|
    t.integer "player_id", null: false
    t.integer "question_result_id", null: false
    t.integer "result", null: false
    t.integer "situation", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["player_id"], name: "index_question_player_results_on_player_id"
    t.index ["question_result_id"], name: "index_question_player_results_on_question_result_id"
  end

  create_table "question_results", force: :cascade do |t|
    t.integer "question_allocation_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["question_allocation_id"], name: "index_question_results_on_question_allocation_id"
  end

  create_table "questions", force: :cascade do |t|
    t.string "text", default: "", null: false
    t.string "answer", default: "", null: false
    t.string "another_answer", default: "", null: false
    t.string "note", default: "", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  add_foreign_key "matchings", "matches"
  add_foreign_key "matchings", "players"
  add_foreign_key "question_allocations", "matches"
  add_foreign_key "question_allocations", "questions"
  add_foreign_key "question_player_results", "players"
  add_foreign_key "question_player_results", "question_results"
  add_foreign_key "question_results", "question_allocations"
end
