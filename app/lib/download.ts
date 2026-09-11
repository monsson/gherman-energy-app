/** Livreaza un fisier catre utilizator. Un singur loc, ca sa nu existe trei variante de <a download>. */
export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Fisierele vin de la backend ca base64, nu ca stream: PWA-ul descarca fara sa treaca prin
 * `sys$FileDescriptor`, pentru care rolurile PWA nu au permisiuni de entitate. Mai scump pe fir,
 * dar pastreaza acelasi refresh de token ca restul apelurilor.
 */
export function downloadBase64(filename: string, base64: string, mime = "application/pdf") {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  downloadBlob(filename, new Blob([bytes], { type: mime }));
}
