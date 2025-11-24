import  { useEffect, useState, useCallback } from "react";
import apiClient from "../../Axios";
import {
  FaPlayCircle,
  FaStopCircle,
  FaLock,
  FaShareAlt,
  FaGlobe,
  FaDownload,
  FaTrashAlt,
} from "react-icons/fa";
import { CiCirclePlus } from "react-icons/ci";
import "../style.css";
import "./Images.css";
import { GoAlert } from "react-icons/go";
import {
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  Slide,
} from "@mui/material";
import bossImg from "../../assets/boss.jpeg";
import ubuntuImg from "../../assets/ubuntu.png";
import cirrosImg from "../../assets/cirros.png";
import windowImg from "../../assets/window.jpeg";
import wordpressImg from "../../assets/wordpress.jpeg";

const getImageByName = (name) => {
  const lower = name.toLowerCase();

  if (lower.includes("ubuntu")) return ubuntuImg;
  if (lower.includes("boss")) return bossImg;
  if (lower.includes("cirros")) return cirrosImg;
  if (lower.includes("window")) return windowImg;
  if (lower.includes("wordpress")) return wordpressImg;

  return "https://via.placeholder.com/150?text=Image";
};


const getStatusIcon = (status) => {
  return status === "active" ? (
    <FaPlayCircle className="status-icon active" />
  ) : (
    <FaStopCircle className="status-icon inactive" />
  );
};

const getVisibilityIcon = (visibility) => {
  if (visibility === "public")
    return <FaGlobe className="visibility-icon public" />;
  if (visibility === "private")
    return <FaLock className="visibility-icon private" />;
  if (visibility === "shared")
    return <FaShareAlt className="visibility-icon shared" />;
  return null;
};

const Images = () => {
  const [imageData, setImageData] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line 
  const [showUploadForm, setShowUploadForm] = useState(false);
  // eslint-disable-next-line 
  const [uploadFile, setUploadFile] = useState(null);
  // eslint-disable-next-line 
  const [uploadName, setUploadName] = useState("");
  const [createVolumeDialogOpen, setCreateVolumeDialogOpen] = useState(false);
  const [selectedImageForVolume, setSelectedImageForVolume] = useState(null);
  const [newVolumeName, setNewVolumeName] = useState("");
  const [newVolumeDescription, setNewVolumeDescription] = useState("");
  const [newVolumeSize, setNewVolumeSize] = useState(2); // Default size
  const [newVolumeAvailabilityZone, setNewVolumeAvailabilityZone] = useState("nova"); // Default AZ
  const [newVolumeType, setNewVolumeType] = useState("_DEFAULT_"); // Default Type
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const showSnackbar = (message, severity) => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbarOpen(false);
  };

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const response = await apiClient.get("/images/");
      const data = response.data;
      if (Array.isArray(data)) {
        setImageData(data);
      } else if (Array.isArray(data.data)) {
        setImageData(data.data);
      } else {
        console.error("API did not return an array");
        setImageData([]);
      }
      setLoading(false);
    } catch (fetchError) {
      console.error("Error fetching image data:", fetchError);
      setImageData([]);
      setLoading(false);
      showSnackbar("Failed to fetch image data.", "error");
    }
  }, []);

  const handleDelete = useCallback(
    async (imageId) => {
      if (window.confirm("Are you sure you want to delete this image?")) {
        try {
          const response = await apiClient.delete(`/image/delete/${imageId}/`);

          if (response.status === 204 || response.status === 200) {
            showSnackbar("Image deleted successfully.", "success");
            fetchData();
          } else {
            console.error(
              "Delete API returned an unexpected status:",
              response.status
            );
            showSnackbar("Failed to delete image.", "error");
          }
        } catch (deleteError) {
          console.error("Error deleting image:", deleteError);
          showSnackbar("Failed to delete image.", "error");
        }
      }
    },
    [fetchData]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDownload = async (imageId, imageName) => {
    try {
      const response = await apiClient.get(`/download-image/${imageId}/`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${imageName}.qcow2`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showSnackbar("Download started successfully.", "success");
    } catch (downloadError) {
      console.error("Error downloading image:", downloadError);
      showSnackbar("Failed to download image.", "error");
    }
  };
// eslint-disable-next-line 
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile || !uploadName) {
      showSnackbar("Please select a file and enter a name.", "warning");
      return;
    }
    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("name", uploadName);

    try {
      const response = await apiClient.post("/create-image/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.status >= 200 && response.status < 300) {
        showSnackbar("Image uploaded successfully.", "success");
        setShowUploadForm(false);
        fetchData();
      } else {
        console.error(
          "Upload API returned an unexpected status:",
          response.status
        );
        showSnackbar("Failed to upload image.", "error");
      }
    } catch (uploadError) {
      console.error("Error uploading image:", uploadError);
      showSnackbar("Failed to upload image.", "error");
    }
  };

  const handleCreateVolumeDialogOpen = (image) => {
    setSelectedImageForVolume(image);
    setCreateVolumeDialogOpen(true);
    setNewVolumeName(`${image.name}-volume`); // Default volume name
  };

  const handleCreateVolumeDialogClose = () => {
    setCreateVolumeDialogOpen(false);
    setSelectedImageForVolume(null);
    setNewVolumeName("");
    setNewVolumeDescription("");
    setNewVolumeSize(2);
    setNewVolumeAvailabilityZone("nova");
    setNewVolumeType("_DEFAULT_");
  };

  const handleCreateVolume = async () => {
    if (!selectedImageForVolume) {
      showSnackbar("No image selected to create volume from.", "warning");
      return;
    }

    const payload = {
      name: newVolumeName,
      description: newVolumeDescription,
      image_name: selectedImageForVolume.name,
      size: parseInt(newVolumeSize, 10),
      availability_zone: newVolumeAvailabilityZone,
      volume_type: newVolumeType,
    };

    try {
      const response = await apiClient.post("/create-volume/", payload);
      if (response.status === 201 || response.status === 200) {
        showSnackbar("Volume created successfully.", "success");
        handleCreateVolumeDialogClose();
      } else {
        console.error(
          "Create Volume API returned an unexpected status:",
          response.status
        );
        showSnackbar("Failed to create volume.", "error");
      }
    } catch (createVolumeError) {
      console.error("Error creating volume:", createVolumeError);
      showSnackbar("Failed to create volume.", "error");
    }
  };

  if (loading) {
    return (
      <div className="cloud-container">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="7.87722 9.61948 33.01 16.88"
        >
          <path
            d="M 12 26 H 37 C 42 26 41 20  37 20 C 38 18 37 15 33 16 C 32 8 15 8 14 17 C 8 16 6 25 12 26"
            className="cloud-back"
          />
          <path
            d="M 12 26 H 37 C 42 26 41 20 37 20 C 38 18 37 15 33 16 C 32 8 15 8 14 17 C 8 16 6 25 12 26"
            className="cloud-front"
          />
        </svg>
        <div className="loading-message">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message">
        <div className="error-icon">
          <GoAlert />
        </div>
        <h2>❌ Server Down</h2>
      </div>
    );
  }

  return (
    <div className="App-image">
      <header className="App-header">
        <h1>Images Dashboard</h1>
      </header>

      <div className="card-container">
        {imageData.map((image, index) => (
          <div className="card" key={index}>
            <div className="card-left">
              <img
                src={getImageByName(image.name)}
                alt={image.name}
                className="circular-image"
              />
              <div className="download-button">
                <button
                  className="btn small-btn"
                  onClick={() => image?.id && image?.name && handleDownload(image.id, image.name)}
                  >
                  <span>
                    <FaDownload />
                  </span>
                  Download
                </button>
              </div>
            </div>
            <div className="card-middle">
              <h4 className="image-title">{image.name}</h4>
              <div className="info">
                <p>
                  <strong>Status:</strong>
                  {getStatusIcon(image.status)} {image.status}
                </p>
                <p>
                  <strong>Visibility:</strong>{" "}
                  {getVisibilityIcon(image.visibility)} {image.visibility}
                </p>
                <p>
                  <strong>Created:</strong>{" "}
                  {new Date(image.created_at).toLocaleDateString()}
                </p>
                <p>
                  <strong>Size:</strong> {image.size}
                </p>
              </div>
            </div>
            <div className="card-right">
            <div className="card-actions one">
                {/* <button
                  className="btn small-btn"
                  onClick={() => handleCreateVolumeDialogOpen(image)}
                >
                  <span>
                    <CiCirclePlus />
                  </span>
                  Create Instance
                </button> */}
              </div>
              <div className="card-actions two">
                <button
                  className="btn small-btn"
                  onClick={() => handleCreateVolumeDialogOpen(image)}
                >
                  <span>
                    <CiCirclePlus />
                  </span>
                  Create Volume
                </button>
              </div>
              <div className="card-actions three">
                <button
                  className="btn small-btn"
                  onClick={() => handleDelete(image.id)}
                >
                  <span>
                    <FaTrashAlt />
                  </span>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Volume Dialog */}
      <Dialog
        open={createVolumeDialogOpen}
        onClose={handleCreateVolumeDialogClose}
        aria-labelledby="create-volume-dialog-title"
      >
        <DialogTitle id="create-volume-dialog-title">
          Create Volume from {selectedImageForVolume?.name}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter the details for the new volume.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Volume Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newVolumeName}
            onChange={(e) => setNewVolumeName(e.target.value)}
          />
          <TextField
            margin="dense"
            id="description"
            label="Description"
            type="text"
            fullWidth
            variant="outlined"
            value={newVolumeDescription}
            onChange={(e) => setNewVolumeDescription(e.target.value)}
          />
          <TextField
            margin="dense"
            id="size"
            label="Size (GB)"
            type="number"
            fullWidth
            variant="outlined"
            value={newVolumeSize}
            onChange={(e) => setNewVolumeSize(e.target.value)}
            inputProps={{ min: 1 }}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel id="availability-zone-label">Availability Zone</InputLabel>
            <Select
              labelId="availability-zone-label"
              id="availability_zone"
              value={newVolumeAvailabilityZone}
              label="Availability Zone"
              onChange={(e) => setNewVolumeAvailabilityZone(e.target.value)}
            >
              <MenuItem value="nova">nova</MenuItem>
              {/* Add other availability zones if needed */}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense">
            <InputLabel id="type-label">Volume Type</InputLabel>
            <Select
              labelId="type-label"
              id="type"
              value={newVolumeType}
              label="Volume Type"
              onChange={(e) => setNewVolumeType(e.target.value)}
            >
              <MenuItem value="_DEFAULT_">_DEFAULT_</MenuItem>
              {/* Add other volume types if needed */}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateVolumeDialogClose}>Cancel</Button>
          <Button onClick={handleCreateVolume} color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        TransitionComponent={Slide}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: "100%" }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default Images;