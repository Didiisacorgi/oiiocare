/* Public client config. The anon key is the same public key already shipped on
   www.oiiocare.com. It is not a service role key and cannot bypass RLS by itself.
   Real model keys belong in server env (see /api/chat and .env.example). */
window.OIIO_PUBLIC = {
  SUPABASE_URL: "https://dkvcogvnuoamliidoocb.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrdmNvZ3ZudW9hbWxpaWRvb2NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NzI3MjksImV4cCI6MjA5MDM0ODcyOX0.xWdKl58B1wePG2XXznKOW-qmlOi9Fb0RAFjeQFYPbOI",
  APP_STORE_URL: "https://apps.apple.com/us/app/oiiocare-%E5%B0%8F%E9%B9%A6%E9%A3%9F%E6%AC%B2/id6754634392"
};
