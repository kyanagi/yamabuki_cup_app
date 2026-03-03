module Scoreboard
  class SseWriter
    # SSE フォーマットで IO-like オブジェクトに書き込む。
    #
    # @rbs stream: IO
    # @rbs event: String
    # @rbs data: Hash[Symbol, untyped]
    # @rbs id: Integer?
    # @rbs return: void
    def self.write(stream, event, data, id: nil)
      stream.write("id: #{id}\n") if id
      stream.write("event: #{event}\n")
      stream.write("data: #{data.to_json}\n\n")
    end
  end
end
