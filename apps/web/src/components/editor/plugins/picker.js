import Compressor from "compressorjs";
import { db } from "../../../common/db";
import { showLoadingDialog } from "../../../common/dialog-controller";
import fs from "../../../interfaces/fs";

function register(editor) {
  editor.ui.registry.addButton("attachment", {
    icon: "attachment",
    tooltip: "Attach a file",
    onAction: () => insertFile(editor),
  });

  editor.ui.registry.addButton("image", {
    icon: "image",
    tooltip: "Insert image",
    onAction: () => insertImage(editor),
  });
}

async function insertImage(editor) {
  const image = await pickImage();
  if (!image) return;
  editor.execCommand("mceAttachImage", image);
}

async function insertFile(editor) {
  const file = await pickFile();
  if (!file) return;
  editor.execCommand("mceAttachFile", file);
}

(function init() {
  global.tinymce.PluginManager.add("picker", register);
})();

async function pickFile() {
  const key = await getEncryptionKey();

  const selectedFile = await showFilePicker({ acceptedFileTypes: "*/*" });
  if (!selectedFile) return;

  const result = await showLoadingDialog({
    title: `${selectedFile.name}`,
    subtitle: "Please wait while we encrypt & attach your file.",
    action: async () => {
      const reader = selectedFile.stream().getReader();
      const { hash, type: hashType } = await fs.hashStream(reader);
      reader.releaseLock();

      let output = {};
      if (!db.attachments.exists(hash)) {
        output = await fs.writeEncryptedFile(selectedFile, key, hash);
      }

      await db.attachments.add({
        ...output,
        hash,
        hashType,
        salt: "helloworld",
        filename: selectedFile.name,
        type: selectedFile.type,
      });

      return {
        hash: hash,
        filename: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
      };
    },
  });

  if (!result.hash) throw new Error("Could not add attachment.");
  return result;
}

async function pickImage() {
  const key = await getEncryptionKey();

  const selectedImage = await showFilePicker({ acceptedFileTypes: "image/*" });
  if (!selectedImage) return;

  const { dataurl, blob } = await compressImage(selectedImage, "buffer");

  const reader = blob.stream().getReader();
  const { hash, type: hashType } = await fs.hashStream(reader);
  reader.releaseLock();

  var output = {};
  if (!db.attachments.exists(hash)) {
    output = await fs.writeEncryptedFile(blob, key, hash);
  }

  await db.attachments.add({
    ...output,
    hash,
    hashType,
    filename: selectedImage.name,
    type: selectedImage.type,
  });

  return {
    hash,
    filename: selectedImage.name,
    type: selectedImage.type,
    size: selectedImage.size,
    dataurl,
  };
}

async function getEncryptionKey() {
  const key = await db.user.getEncryptionKey();
  if (!key) throw new Error("No encryption key found. Are you logged in?");
  return key; // { password: "helloworld" };
}

/**
 *
 * @returns {Promise<File>}
 */
function showFilePicker({ acceptedFileTypes }) {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", acceptedFileTypes);
    input.dispatchEvent(new MouseEvent("click"));
    input.onchange = async function () {
      var file = this.files[0];
      if (!file) return null;
      resolve(file);
    };
  });
}

/**
 *
 * @param {File} file
 * @param {"base64"|"buffer"} type
 * @returns {Promise<Blob>}
 */
function compressImage(file, type) {
  return new Promise((resolve, reject) => {
    new Compressor(file, {
      quality: 0.8,
      mimeType: file.type,
      maxWidth: 2000,
      maxHeight: 2000,
      /**
       *
       * @param {Blob} result
       */
      async success(result) {
        const buffer = await result.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        resolve({
          dataurl: `data:${file.type};base64,${base64}`,
          blob: result,
        });
      },
      error(err) {
        reject(err);
      },
    });
  });
}