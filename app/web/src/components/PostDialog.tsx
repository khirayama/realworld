import { useState, useRef } from "react";
import { Dialog } from "@headlessui/react";

import { getURL } from "utils";

export function PostDialog(props: {
  open: boolean;
  onClose: () => void;
  post?: Post;
}) {
  const [preview, setPreview] = useState(
    props.post ? props.post.imagePath : ""
  );
  const [content, setContent] = useState(props.post ? props.post.content : "");
  const [isCameraOn, setIsCameraOn] = useState(false);

  const fileRef = useRef<HTMLInputElement>();
  const videoRef = useRef<HTMLVideoElement>();
  const canvasRef = useRef<HTMLCanvasElement>();

  function cameraOn() {
    navigator.mediaDevices.getUserMedia({ video: true }).then((vs) => {
      videoRef.current.srcObject = vs;
      videoRef.current.play();
    });
  }

  function cameraOff() {
    videoRef.current?.srcObject?.getTracks().forEach((track) => track.stop());
  }

  return (
    <>
      <Dialog
        open={props.open}
        onClose={() => {
          setPreview("");
          setContent("");
          setIsCameraOn(false);
          cameraOff();
          props.onClose();
        }}
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

        <div className="fixed inset-0 w-screen overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            {isCameraOn ? (
              <Dialog.Panel className="m-full fixed inset-0 h-full bg-black">
                <div className="fixed top-0 w-full">
                  <video ref={videoRef} className="w-full" />
                  <canvas ref={canvasRef} width="0" height="0" />
                </div>
                <div className="fixed bottom-0 w-full pb-8 pt-4 text-center">
                  <button
                    className="h-20 w-20 rounded-full bg-red-700"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
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
                      cameraOff();
                      setIsCameraOn(false);
                      setPreview(data);
                    }}
                  />
                  <button
                    className="text-white"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      cameraOff();
                      setIsCameraOn(false);
                    }}
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            ) : (
              <Dialog.Panel className="mx-auto max-w-sm rounded bg-white p-4">
                <Dialog.Title className="pb-4 pt-2 text-center font-bold">
                  Create new post
                </Dialog.Title>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    fetch(preview)
                      .then((res) => res.blob())
                      .then((blob) => {
                        const fd = new FormData();
                        fd.append("postImage", blob);
                        fd.append("content", content);
                        fetch(getURL("/posts"), {
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
                  {preview ? (
                    <div className="w-full">
                      <img src={preview} />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setPreview("");
                        }}
                      >
                        Clear
                      </button>
                      <div>
                        <input
                          type="text"
                          name="content"
                          value={content}
                          placeholder="Input caption"
                          onChange={(e) => {
                            setContent(e.currentTarget.value);
                          }}
                        />
                      </div>
                      <button>Submit</button>
                    </div>
                  ) : (
                    <div className="w-full rounded bg-gray-300 py-12 text-center">
                      <label htmlFor="postImage">
                        Select from computer or drop
                      </label>
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
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsCameraOn(true);
                          cameraOn();
                        }}
                      >
                        Use camera
                      </button>
                    </div>
                  )}
                </form>
              </Dialog.Panel>
            )}
          </div>
        </div>
      </Dialog>
    </>
  );
}
