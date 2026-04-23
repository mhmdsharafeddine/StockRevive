export function queueSnackbar(message, type = "success") {
  sessionStorage.setItem("stockrevive_snackbar", JSON.stringify({ message, type }));
}

export function showSnackbar(message, type = "success") {
  window.dispatchEvent(new CustomEvent("stockrevive:snackbar", { detail: { message, type } }));
}
