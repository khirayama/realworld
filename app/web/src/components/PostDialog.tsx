import { useState, useRef } from "react";
import { Dialog } from "@headlessui/react";

import { getClientId } from "utils";

export function PostDialog(props: { open: boolean; onClose: () => void }) {
  const [preview, setPreview] = useState("");
  const [content, setContent] = useState("");

  const fileRef = useRef<HTMLInputElement>();
  const videoRef = useRef<HTMLVideoElement>();
  const canvasRef = useRef<HTMLCanvasElement>();

  return (
    <Dialog
      open={props.open}
      onClose={() => {
        videoRef.current.srcObject
          ?.getTracks()
          .forEach((track) => track.stop());
        setPreview("");
        setContent("");
        props.onClose();
      }}
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 w-screen overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm rounded bg-white p-4">
            <Dialog.Title>Create new post</Dialog.Title>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetch(preview)
                  .then((res) => res.blob())
                  .then((blob) => {
                    const fd = new FormData();
                    fd.append("postImage", blob);
                    fd.append("clientId", getClientId());
                    fd.append("content", content);
                    fetch("http://localhost:3001/posts", {
                      method: "POST",
                      body: fd,
                    }).then(() => {
                      setPreview("");
                      setContent("");
                      props.onClose();
                    });
                  });
              }}
            >
              <button>Submit</button>
              <div>
                <label htmlFor="postContent">Comments</label>
                <input
                  type="text"
                  name="content"
                  value={content}
                  onChange={(e) => {
                    setContent(e.currentTarget.value);
                  }}
                />
              </div>
              <div>
                <label htmlFor="postImage">Select from computer</label>
                <input
                  ref={fileRef}
                  type="file"
                  name="postImage"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.currentTarget.files[0];
                    if (file) {
                      const src = URL.createObjectURL(file);
                      setPreview(src);
                    }
                  }}
                />
                <img src={preview} />
              </div>
            </form>
            <div>
              <video ref={videoRef} />
              <canvas ref={canvasRef} width="0" height="0" />
              <button
                onClick={() => {
                  navigator.mediaDevices
                    .getUserMedia({ video: true })
                    .then((vs) => {
                      videoRef.current.srcObject = vs;
                      videoRef.current.play();
                    });
                }}
              >
                Use camera
              </button>
              <button
                onClick={() => {
                  const el = videoRef.current;
                  const w = el.videoWidth;
                  const h = el.videoHeight;
                  const canvas = canvasRef.current;
                  const ctx = canvas.getContext("2d");
                  videoRef.current.width = w;
                  videoRef.current.height = h;
                  canvas.width = w;
                  canvas.height = h;
                  ctx.drawImage(el, 0, 0, w, h);
                  const data = canvas.toDataURL("image/png");
                  videoRef.current.width = 0;
                  videoRef.current.height = 0;
                  canvas.width = 0;
                  canvas.height = 0;
                  setPreview(data);
                  videoRef.current.srcObject
                    ?.getTracks()
                    .forEach((track) => track.stop());
                }}
              >
                Take picture
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  );
}
