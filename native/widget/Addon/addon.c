// A Node-API module with one function, reload(), that asks macOS to redraw the widget.
// The few Node-API calls are declared here and resolved from Electron at load time.
#include <stddef.h>

typedef struct napi_env__ *napi_env;
typedef struct napi_value__ *napi_value;
typedef struct napi_callback_info__ *napi_callback_info;
typedef napi_value (*napi_callback)(napi_env, napi_callback_info);
int napi_create_function(napi_env, const char *, size_t, napi_callback, void *, napi_value *);
int napi_set_named_property(napi_env, napi_value, const char *, napi_value);
int napi_get_undefined(napi_env, napi_value *);

void ad_reload_widgets(void);

static napi_value reload(napi_env env, napi_callback_info info) {
  ad_reload_widgets();
  napi_value undefined;
  napi_get_undefined(env, &undefined);
  return undefined;
}

napi_value napi_register_module_v1(napi_env env, napi_value exports) {
  napi_value fn;
  napi_create_function(env, "reload", 6, reload, NULL, &fn);
  napi_set_named_property(env, exports, "reload", fn);
  return exports;
}
