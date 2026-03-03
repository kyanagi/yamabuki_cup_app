module Scoreboard
  class EventLog
    SseEntry = Data.define(:id, :event, :data)
    MAX_ENTRIES = 100

    INSTANCE_MUTEX = Mutex.new
    private_constant :INSTANCE_MUTEX

    # クラスレベルの Mutex でシングルトン初期化を保護する（スレッドセーフ）
    def self.instance
      @instance || INSTANCE_MUTEX.synchronize { @instance ||= new }
    end

    def self.reset!
      INSTANCE_MUTEX.synchronize { @instance = nil }
    end

    def initialize
      @mutex = Mutex.new
      @entries = []
      @next_id = 1
    end

    # イベントを記録し採番済みエントリを返す
    #
    # @rbs event: String
    # @rbs data: Hash[Symbol, untyped]
    # @rbs return: SseEntry
    def record(event, data)
      @mutex.synchronize do
        entry = SseEntry.new(id: @next_id, event: event, data: data)
        @next_id += 1
        @entries << entry
        @entries.shift if @entries.size > MAX_ENTRIES
        entry
      end
    end

    # last_id より後のエントリを返す。
    # last_id が保持範囲外（欠損が発生している）か未来IDの場合は nil を返す。
    # nil を返すとコントローラが resync_required をクライアントへ送信する。
    #
    # @rbs last_id: Integer
    # @rbs return: Array[SseEntry] | nil
    def events_after(last_id)
      @mutex.synchronize do
        current_max = @next_id - 1
        oldest = @entries.first&.id

        if last_id > 0
          return nil if last_id > current_max # 未来ID（再起動後の旧IDなど）
          return nil if oldest.nil? || last_id < oldest - 1 # 欠損あり（古すぎるID）
        end

        @entries.select { |e| e.id > last_id }
      end
    end

    # 現時点の最大IDを返す（0 = 記録なし）
    #
    # @rbs return: Integer
    def current_max_id
      @mutex.synchronize { @next_id - 1 }
    end

    # 最古エントリのIDを返す（0 = 記録なし）
    #
    # @rbs return: Integer
    def oldest_id
      @mutex.synchronize { @entries.first&.id || 0 }
    end
  end
end
