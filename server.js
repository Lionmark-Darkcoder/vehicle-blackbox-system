#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>

/* WIFI */
const char* ssid = "YOUR_WIFI";
const char* password = "YOUR_PASS";

/* SERVER */
const char* serverUrl = "http://YOUR_SERVER_IP:10000/upload";

/* CAMERA PINS (AI THINKER) */
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27

#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5

#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

#define FLASH_LED 4

bool busy = false;

/* CAMERA CONFIG */
camera_config_t config;

void startCamera(bool streamMode) {

  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;

  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;

  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;

  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;

  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;

  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  if (streamMode) {
    config.frame_size = FRAMESIZE_QVGA;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_QVGA;
    config.fb_count = 1;
  }

  config.jpeg_quality = 12;

  esp_camera_init(&config);
}

/* CAPTURE + UPLOAD */
void sendImage(String type) {

  static unsigned long last = 0;
  if (millis() - last < 4000) return;
  last = millis();

  if (busy) return;
  busy = true;

  Serial.println("📸 Capture start");

  esp_camera_deinit();
  delay(200);

  startCamera(false);
  delay(300);

  digitalWrite(FLASH_LED, HIGH);
  delay(150);

  camera_fb_t * fb = esp_camera_fb_get();

  digitalWrite(FLASH_LED, LOW);

  if (!fb) {
    Serial.println("❌ Capture failed");
    busy = false;
    return;
  }

  WiFiClient client;
  HTTPClient http;

  http.begin(client, serverUrl);
  http.addHeader("Content-Type", "image/jpeg");
  http.addHeader("type", type);
  http.addHeader("location", "Chemperi");
  http.addHeader("lat", "12.0676");
  http.addHeader("lng", "75.5716");

  int res = http.POST(fb->buf, fb->len);

  if (res > 0) Serial.println("✅ Uploaded");
  else Serial.println("❌ Upload fail");

  http.end();
  esp_camera_fb_return(fb);

  esp_camera_deinit();
  delay(200);

  startCamera(true);

  Serial.println("📡 Stream resumed");

  busy = false;
}

/* SETUP */
void setup() {
  Serial.begin(115200);
  pinMode(FLASH_LED, OUTPUT);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\n✅ WiFi Connected");
  Serial.println(WiFi.localIP());

  startCamera(true);

  Serial.println("READY: S D A B Y H O C I");
}

/* LOOP */
void loop() {
  if (Serial.available()) {
    char c = Serial.read();

    switch (c) {
      case 'S': sendImage("SEATBELT"); break;
      case 'D': sendImage("DOOR"); break;
      case 'A': sendImage("ALCOHOL"); break;
      case 'B': sendImage("HARSH_BRAKING"); break;
      case 'Y': sendImage("DROWSINESS"); break;
      case 'H': sendImage("HARSH_DRIVING"); break;
      case 'O': sendImage("OVERSPEED"); break;
      case 'C': sendImage("COLLISION"); break;
      case 'I': sendImage("ACCIDENT"); break;
    }
  }
}