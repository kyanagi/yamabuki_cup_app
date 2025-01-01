import { defineConfig } from 'vite'
import RubyPlugin from "vite-plugin-ruby";
import FullReload from "vite-plugin-full-reload";
import ReactPlugin from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [
    RubyPlugin(),
    FullReload(['config/routes.rb', 'app/views/**/*']),
    ReactPlugin(),
  ],
})
