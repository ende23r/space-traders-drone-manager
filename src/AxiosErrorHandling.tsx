import { AxiosError } from "axios";
import { toast } from "react-toastify";

export function handleAxiosError(error: AxiosError) {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.log(error.response.status);
    console.log(error.response.data);
    console.log(error.response.headers);

    const errorMsg = (
      <div>
        Status: {error.response.status}
        <br />
        Data: {JSON.stringify(error.response.data)}
      </div>
    );
    toast(errorMsg);
  } else if (error.request) {
    // The request was made but no response was received
    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
    // http.ClientRequest in node.js
    console.log(error.request);
    toast(error.request);
  } else {
    // Something happened in setting up the request that triggered an Error
    console.log("Error", error.message);
    toast(error.request);
  }
  console.log(error.config);
}
