import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";

// specs/security/file-uploads.md §1 — allowlist e limite de tamanho do
// bucket `avatars`, replicados aqui só para dar feedback cedo ao usuário
// (nunca desperdiçar uma signed URL pedindo upload que o backend vai
// rejeitar de qualquer forma) — a validação real e definitiva é sempre a do
// backend/bucket.
export const AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const AVATAR_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AvatarAllowedMimeType = (typeof AVATAR_ALLOWED_MIME_TYPES)[number];

export class AvatarValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AvatarValidationError";
  }
}

export interface PickedAvatarImage {
  uri: string;
  mimeType: AvatarAllowedMimeType;
  fileSize: number;
}

function normalizeMimeType(
  candidate: string | undefined,
  fileUri: string,
): string {
  if (candidate) return candidate.toLowerCase();
  // Alguns pickers/versões de SO não preenchem `mimeType` — melhor esforço a
  // partir da extensão do arquivo antes de rejeitar.
  const ext = fileUri.split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "";
}

function assertAllowedImage(
  mimeType: string,
  fileSize: number | undefined,
): asserts mimeType is AvatarAllowedMimeType {
  if (!AVATAR_ALLOWED_MIME_TYPES.includes(mimeType as AvatarAllowedMimeType)) {
    throw new AvatarValidationError(
      "Essa foto não pode. Escolha uma imagem JPEG, PNG ou WEBP.",
    );
  }
  if (fileSize !== undefined && fileSize > AVATAR_MAX_SIZE_BYTES) {
    throw new AvatarValidationError(
      "Essa foto é grande demais. Escolha uma de até 5MB.",
    );
  }
}

async function toPickedAvatarImage(
  asset: ImagePicker.ImagePickerAsset,
): Promise<PickedAvatarImage> {
  const mimeType = normalizeMimeType(asset.mimeType, asset.uri);

  // `fileSize` nem sempre vem preenchido pelo picker (varia por SO/origem) —
  // confirma lendo o arquivo já copiado localmente antes de decidir.
  let fileSize = asset.fileSize;
  if (fileSize === undefined) {
    const info = await FileSystem.getInfoAsync(asset.uri, { size: true });
    fileSize = info.exists ? (info.size ?? 0) : 0;
  }

  assertAllowedImage(mimeType, fileSize);

  return { uri: asset.uri, mimeType, fileSize };
}

async function launchPicker(
  source: "library" | "camera",
): Promise<ImagePicker.ImagePickerAsset | null> {
  const permission =
    source === "library"
      ? await ImagePicker.requestMediaLibraryPermissionsAsync()
      : await ImagePicker.requestCameraPermissionsAsync();

  if (!permission.granted) {
    throw new AvatarValidationError(
      source === "library"
        ? "A gente precisa da permissão pra acessar suas fotos."
        : "A gente precisa da permissão pra usar a câmera.",
    );
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.9,
  };

  const result =
    source === "library"
      ? await ImagePicker.launchImageLibraryAsync(options)
      : await ImagePicker.launchCameraAsync(options);

  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0];
}

/** Abre a galeria, com crop quadrado. Retorna `null` se o usuário cancelar. */
export async function pickAvatarFromLibrary(): Promise<PickedAvatarImage | null> {
  const asset = await launchPicker("library");
  return asset ? toPickedAvatarImage(asset) : null;
}

/** Abre a câmera, com crop quadrado. Retorna `null` se o usuário cancelar. */
export async function pickAvatarFromCamera(): Promise<PickedAvatarImage | null> {
  const asset = await launchPicker("camera");
  return asset ? toPickedAvatarImage(asset) : null;
}

/**
 * `PUT` do binário da imagem local direto na signed `uploadUrl`
 * (specs/security/file-uploads.md §2, passo 2). Usa `FileSystem.uploadAsync`
 * com `BINARY_CONTENT` em vez de ler o arquivo inteiro em memória (ex.:
 * base64), mais adequado a fotos de câmera que podem chegar perto do limite
 * de 5MB.
 */
export async function putAvatarFile(
  uploadUrl: string,
  localUri: string,
  mimeType: string,
): Promise<void> {
  const result = await FileSystem.uploadAsync(uploadUrl, localUri, {
    httpMethod: "PUT",
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: { "Content-Type": mimeType },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(
      `Falha ao enviar avatar para o Storage (status ${result.status}).`,
    );
  }
}
