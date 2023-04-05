const securityHeaders = {
  "Content-Security-Policy": "upgrade-insecure-requests",
  "Strict-Transport-Security": "max-age=1000",
  "X-Xss-Protection": "1; mode=block",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Feature-Policy":
    "accelerometer 'none'; midi 'none'; focus-without-user-activation 'none'; " +
    "usb 'none'; magnetometer 'none'; payment 'none'; picture-in-picture 'none'; fullscreen 'none'; " +
    "vr 'none'; encrypted-media 'none'; autoplay 'none'; speaker 'none'; ambient-light-sensor 'none'; " +
    "gyroscope 'none'; sync-xhr 'none'; " +
    "camera 'none'; geolocation 'none'; microphone 'none'; "
};

const removeHeaders = [
  "x-amz-id-2",
  "x-amz-meta-src_last_modified_millis",
  "x-amz-request-id",
  "x-amz-version-id"
];

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event));
});

function validateRequest(request) {
  /*
    Validate request METHOD against valid. At this time, only
    GET requests are allowed.
     */
  const method = request.method;
  const cf = request.cf;
  const valid = ["GET"];
  const isItValid = valid.indexOf(method);
  // If it is not a valid request METHOD, log it
  if (isItValid === -1) {
    return new Response("Not allowed.", {
      status: 403,
      statusText: 403,
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "public, max-age=30672000"
      }
    });
  }
}

async function handleRequest(event) {
  // Cache
  let cache = caches.default;
  const request = event.request;

  // This is if I am making a POST request
  event.waitUntil(validateRequest(request));

  if (validateRequest(request)) {
    console.log(`Non GET Request (${request.method})`);
    return validateRequest(request);
  }
  // Source URL
  let src = new URL(event.request.url);

  // Destination URL
  let dst = new URL(BUCKET_URL);
  dst.pathname += src.pathname;

  /*
  Cache
  */
  const cacheKey = dst.toString();
  let response = await cache.match(cacheKey);
  if (!response) { 
    console.log(`Response for request url: ${request.url} not present in cache`);
    response = await fetch(dst, {
      cf: {
        cacheEverything: true,
        cacheKey: dst,
        apps: false,
        minify: {
          javascript: true,
          css: true,
          html: true
        }
      }
    });
    // Put into cache if it doesn't exist
    event.waitUntil(cache.put(cacheKey, response.clone()))
  }

  /*
    Header stuff
  */
  let newHdrs = new Headers(response.headers);

  // Set ETag header
  newHdrs.set("ETag", newHdrs.get("ETag"));

  // Set the security headers
  Object.keys(securityHeaders).map(function(name, index) {
    newHdrs.set(name, securityHeaders[name]);
  });

  let setHeaders = Object.assign({}, securityHeaders);
  Object.keys(setHeaders).forEach(name => {
    newHdrs.set(name, setHeaders[name]);
  });

  // Remove these headers
  removeHeaders.forEach(function(name) {
    newHdrs.delete(name);
  });

  /*
  Response
  */
  const init = {
    status: response.status,
    statusText: response.statusText,
    headers: newHdrs
  };
  return new Response(response.body, init);
}
