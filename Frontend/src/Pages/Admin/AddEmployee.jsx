import React, { useState, useEffect, useMemo } from "react";
import {
  TextField,
  Button,
  Grid2,
  Paper,
  Typography,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import Autocomplete from "@mui/material/Autocomplete";
import apiClient from "../../Axios";

/* ✅ Hardcoded Groups */
const GROUP_OPTIONS = ["HR", "IT", "Finance"];

/* ✅ Email Regex */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AddEmployee = () => {
  const [formData, setFormData] = useState({
    name: "",
    employee_id: "",
    email: "",
    group: "",
    fla_name: "",
    fla_email: "",
    fla_employee_id: "",
    is_fla: false,
  });

  const [emailError, setEmailError] = useState(false);

  const [flaList, setFlaList] = useState([]);
  const [isBootstrap, setIsBootstrap] = useState(false);

  const [csvFile, setCsvFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [previewDone, setPreviewDone] = useState(false);

  const [alertDialog, setAlertDialog] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  /* ------------------ Fetch FLA List ------------------ */
 const fetchFlaList = async () => {
  try {
    const res = await apiClient.get("/employees/fla-list/");

    if (res.data?.bootstrap !== undefined) {
      setIsBootstrap(res.data.bootstrap);
      setFlaList(res.data.flas || []);
    } else {
      setFlaList(res.data || []);
      setIsBootstrap((res.data || []).length === 0);
    }
  } catch (err) {
    setFlaList([]);
    setIsBootstrap(true);
  }
};
useEffect(() => {
  fetchFlaList();
}, []);

  /* ------------------ Unique FLAs ------------------ */
  const uniqueFlaList = useMemo(() => {
    const map = new Map();
    flaList.forEach((f) => map.set(f.employee_id, f));
    return Array.from(map.values());
  }, [flaList]);

  /* ------------------ Auto ROOT FLA ------------------ */
  useEffect(() => {
    if (isBootstrap) {
      setFormData((p) => ({
        ...p,
        is_fla: true,
        fla_name: "",
        fla_employee_id: "",
        fla_email: "",
      }));
    }
  }, [isBootstrap]);

  /* ------------------ Handlers ------------------ */
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "email") {
      setEmailError(!EMAIL_REGEX.test(value));
    }

    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (emailError) return;

    const payload = { ...formData };

    if (isBootstrap) {
      payload.is_fla = true;
      payload.fla_name = null;
      payload.fla_employee_id = null;
      payload.fla_email = null;
    }

    try {
      await apiClient.post("/employees/", payload);
      await fetchFlaList();
      setAlertDialog({
        open: true,
        message: "Employee added successfully!",
        severity: "success",
      });

      setFormData({
        name: "",
        employee_id: "",
        email: "",
        group: "",
        fla_name: "",
        fla_email: "",
        fla_employee_id: "",
        is_fla: false,
      });
      setEmailError(false);
    } catch (err) {
      setAlertDialog({
        open: true,
        message:
          err.response?.data?.detail || "Failed to add employee",
        severity: "error",
      });
    }
  };

  /* ------------------ CSV ------------------ */
  const handleFileChange = (e) => {
    setCsvFile(e.target.files[0]);
    setPreviewData([]);
    setPreviewDone(false);
  };

  const handlePreview = async () => {
    if (!csvFile) return;

    const fd = new FormData();
    fd.append("file", csvFile);

    const res = await apiClient.post("/employees/bulk-preview/", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    setPreviewData(res.data.rows || []);
    setPreviewDone(true);
  };

  const handleBulkUpload = async () => {
    const fd = new FormData();
    fd.append("file", csvFile);

    const res = await apiClient.post("/employees/bulk-upload/", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    setAlertDialog({
      open: true,
      message: `Created: ${res.data.created_count}, Failed: ${res.data.failed_count}`,
      severity: "success",
    });

    setCsvFile(null);
    setPreviewData([]);
    setPreviewDone(false);
  };

  const handleDownloadTemplate = async () => {
    const res = await apiClient.get("/employees/csv-template/", {
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = "employee_bulk_template.csv";
    a.click();
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h5">Add Employee</Typography>

        <form onSubmit={handleSubmit}>
          <Grid2 container spacing={2}>
            <Grid2 item xs={12} sm={6}>
              <TextField
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                fullWidth
                required
              />
            </Grid2>

            <Grid2 item xs={12} sm={6}>
              <TextField
                label="Employee ID"
                name="employee_id"
                value={formData.employee_id}
                onChange={handleChange}
                fullWidth
                required
              />
            </Grid2>

            <Grid2 item xs={12} sm={6}>
              <TextField
                label="Email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                fullWidth
                required
                error={emailError}
                helperText={emailError ? "Enter a valid email address" : ""}
              />
            </Grid2>

            <Grid2 item xs={12} sm={6}>
              <TextField
                select
                label="Group"
                name="group"
                value={formData.group}
                onChange={handleChange}
                fullWidth
                required
              >
                {GROUP_OPTIONS.map((grp) => (
                  <MenuItem key={grp} value={grp}>
                    {grp}
                  </MenuItem>
                ))}
              </TextField>
            </Grid2>

            {isBootstrap && (
              <Grid2 item xs={12}>
                <Typography color="warning.main">
                  This employee will be created as <b>ROOT FLA</b>.
                </Typography>
              </Grid2>
            )}

            {!isBootstrap && (
              <Grid2 item xs={12} sm={6}>
                <Autocomplete
                  options={uniqueFlaList}
                  disableClearable
                  getOptionLabel={(o) =>
                    `${o.name} (${o.employee_id})`
                  }
                  onChange={(e, v) =>
                    setFormData((p) => ({
                      ...p,
                      fla_name: v.name,
                      fla_employee_id: v.employee_id,
                      fla_email: v.email,
                    }))
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="Reporting Officer" required />
                  )}
                />
              </Grid2>
            )}

            {!isBootstrap && (
              <Grid2 item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.is_fla}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          is_fla: e.target.checked,
                        }))
                      }
                    />
                  }
                  label="Mark as FLA"
                />
              </Grid2>
            )}

            <Grid2 item xs={12}>
              <Button
                type="submit"
                variant="contained"
                disabled={emailError}
              >
                Add Employee
              </Button>
            </Grid2>
          </Grid2>
        </form>
      </Paper>

      {/* BULK UPLOAD */}
      <Paper elevation={3} sx={{ p: 3, mt: 4 }}>
        <Typography variant="h6">Bulk Upload Employees</Typography>

        <input type="file" accept=".csv" onChange={handleFileChange} />

        <Button onClick={handlePreview} disabled={!csvFile}>
          Preview
        </Button>

        <Button
          onClick={handleBulkUpload}
          disabled={
            !previewDone || previewData.some((r) => !r.valid)
          }
        >
          Upload
        </Button>

        <Button onClick={handleDownloadTemplate}>
          Download Template
        </Button>

        {previewData.length > 0 && (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Row</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Message</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {previewData.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>
                    {r.valid ? "OK" : "ERROR"}
                  </TableCell>
                  <TableCell>
                    {r.errors?.join(", ")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* DIALOG */}
      <Dialog
        open={alertDialog.open}
        onClose={() => setAlertDialog({ ...alertDialog, open: false })}
      >
        <DialogTitle align="center">
          {alertDialog.severity === "success" ? (
            <CheckCircleIcon color="success" sx={{ fontSize: 60 }} />
          ) : (
            <ErrorIcon color="error" sx={{ fontSize: 60 }} />
          )}
        </DialogTitle>
        <DialogContent>
          <Typography align="center">
            {alertDialog.message}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center" }}>
          <Button
            onClick={() =>
              setAlertDialog({ ...alertDialog, open: false })
            }
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AddEmployee;





// import React, { useState, useEffect, useMemo } from "react";
// import {
//   TextField,
//   Button,
//   Grid2,
//   Paper,
//   Typography,
//   Container,
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   MenuItem,
//   Checkbox,
//   FormControlLabel,
//   Table,
//   TableHead,
//   TableRow,
//   TableCell,
//   TableBody,
// } from "@mui/material";
// import CheckCircleIcon from "@mui/icons-material/CheckCircle";
// import ErrorIcon from "@mui/icons-material/Error";
// import Autocomplete from "@mui/material/Autocomplete";
// import apiClient from "../../Axios";

// const AddEmployee = () => {
//   const [formData, setFormData] = useState({
//     name: "",
//     employee_id: "",
//     email: "",
//     group: "",
//     fla_name: "",
//     fla_email: "",
//     fla_employee_id: "",
//     is_fla: false,
//   });
//   const [csvFile, setCsvFile] = useState(null);
//   const [groups, setGroups] = useState([]);
//   const [flaList, setFlaList] = useState([]);
//   const [previewData, setPreviewData] = useState([]);
//   const [previewDone, setPreviewDone] = useState(false);
//   const [alertDialog, setAlertDialog] = useState({
//     open: false,
//     message: "",
//     severity: "success", // "success" or "error"
//   });

//   /* ------------------ Fetch Data ------------------ */
//   useEffect(() => {
//     apiClient.get("/employees/groups/").then((res) => setGroups(res.data));
//     apiClient
//       .get("/employees/fla-list/")
//       .then((res) => setFlaList(res.data.results || res.data || []))
//       .catch(() => setFlaList([]));
//   }, []);

//   /* ------------------ Helpers ------------------ */
//   const uniqueFlaList = useMemo(() => {
//     const map = new Map();
//     flaList.forEach((f) => map.set(f.fla_employee_id, f));
//     return Array.from(map.values());
//   }, [flaList]);

//   const hasErrors = previewData.length > 0 && previewData.some((r) => !r.valid);

//   /* ------------------ Handlers ------------------ */
//   const handleChange = (e) =>
//     setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       await apiClient.post("/employees/", formData);
//       setAlertDialog({
//         open: true,
//         message: "Employee added successfully!",
//         severity: "success",
//       });
//       setFormData({
//         name: "",
//         employee_id: "",
//         email: "",
//         group: "",
//         fla_name: "",
//         fla_email: "",
//         fla_employee_id: "",
//         is_fla: false,
//       });
//     } catch (err) {
//       setAlertDialog({
//         open: true,
//         message: "Failed to add employee",
//         severity: "error",
//       });
//     }
//   };

//   useEffect(() => {
//     const fetchFlaList = async () => {
//       try {
//         const res = await apiClient.get("/employees/fla-list/");
//         setFlaList(res.data.results || res.data || []);
//       } catch (err) {
//         console.error("Failed to load FLA list", err);
//         setFlaList([]);
//       }
//     };

//     fetchFlaList();
//   }, []);

//   /* ------------------ CSV ------------------ */
//   const handleFileChange = (e) => {
//     setCsvFile(e.target.files[0]);
//     setPreviewData([]);
//     setPreviewDone(false);
//   };

//   const handlePreview = async () => {
//     if (!csvFile) return;

//     const fd = new FormData();
//     fd.append("file", csvFile);

//     const res = await apiClient.post("/employees/bulk-preview/", fd, {
//       headers: { "Content-Type": "multipart/form-data" },
//     });

//     setPreviewData(res.data.rows);
//     setPreviewDone(true);
//   };

//   const handleBulkUpload = async () => {
//     const fd = new FormData();
//     fd.append("file", csvFile);

//     const res = await apiClient.post("/employees/bulk-upload/", fd, {
//       headers: { "Content-Type": "multipart/form-data" },
//     });

//     setAlertDialog({
//       open: true,
//       message: `Created: ${res.data.created_count}\nFailed: ${res.data.failed_count}`,
//       severity: "success",
//     });

//     setCsvFile(null);
//     setPreviewData([]);
//     setPreviewDone(false);
//   };

//   const handleDownloadTemplate = async () => {
//     const res = await apiClient.get("/employees/csv-template/", {
//       responseType: "blob",
//     });
//     const url = window.URL.createObjectURL(new Blob([res.data]));
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = "employee_bulk_template.csv";
//     a.click();
//   };

//   return (
//     <Container maxWidth="md">
//       <Paper elevation={3} sx={{ padding: 4, marginTop: 4 }}>
//         <Typography variant="h5" gutterBottom>
//           Add Employee
//         </Typography>

//         <form onSubmit={handleSubmit}>
//           <Grid2 container spacing={2}>
//             {/* Employee Basic Fields */}
//             {[
//               ["name", "Name"],
//               ["employee_id", "Employee ID"],
//               ["email", "Email"],
//             ].map(([field, label]) => (
//               <Grid2 item xs={12} sm={6} key={field}>
//                 <TextField
//                   label={label}
//                   name={field}
//                   value={formData[field]}
//                   onChange={handleChange}
//                   fullWidth
//                   required
//                 />
//               </Grid2>
//             ))}

//             {/* Group Dropdown */}
//             <Grid2 item xs={12} sm={6} sx={{ width: "30%" }}>
//               <TextField
//                 select
//                 label="Group"
//                 name="group"
//                 value={formData.group}
//                 onChange={handleChange}
//                 fullWidth
//                 required
//               >
//                 {groups.map((grp) => (
//                   <MenuItem key={grp} value={grp}>
//                     {grp}
//                   </MenuItem>
//                 ))}
//               </TextField>
//             </Grid2>

//             {/* ✅ Reporting Officer Dropdown (ADD HERE) */}
//             <Grid2 item xs={12} sm={6} sx={{ width: "30%" }}>
//               <Autocomplete
//                 options={uniqueFlaList} // or flaList if backend fixed
//                 fullWidth
//                 disablePortal
//                 value={
//                   uniqueFlaList.find(
//                     (f) => f.fla_employee_id === formData.fla_employee_id
//                   ) || null
//                 }
//                 getOptionLabel={(option) =>
//                   `${option.fla_name} (${option.fla_employee_id})`
//                 }
//                 isOptionEqualToValue={(option, value) =>
//                   option.fla_employee_id === value.fla_employee_id
//                 }
//                 onChange={(event, selected) => {
//                   if (!selected) return;

//                   setFormData((prev) => ({
//                     ...prev,
//                     fla_name: selected.fla_name,
//                     fla_employee_id: selected.fla_employee_id,
//                     fla_email: selected.fla_email,
//                   }));
//                 }}
//                 renderInput={(params) => (
//                   <TextField
//                     {...params}
//                     label="Reporting Officer (FLA / SLA)"
//                     fullWidth
//                     required
//                   />
//                 )}
//               />
//             </Grid2>
//             <Grid2 item xs={12} sm={6}>
//               <FormControlLabel
//                 control={
//                   <Checkbox
//                     checked={formData.is_fla}
//                     onChange={(e) =>
//                       setFormData((prev) => ({
//                         ...prev,
//                         is_fla: e.target.checked,
//                       }))
//                     }
//                   />
//                 }
//                 label="Mark as FLA"
//               />
//             </Grid2>

//             {/* Submit */}
//             <Grid2 item xs={12}>
//               <Button type="submit" variant="contained" color="primary">
//                 Add Employee
//               </Button>
//             </Grid2>
//           </Grid2>
//         </form>
//       </Paper>

//       {/* ----------- Bulk Upload ----------- */}
//       <Paper elevation={3} sx={{ p: 3, mt: 4 }}>
//         <Typography variant="h6">Bulk Upload Employees (CSV)</Typography>

//         <input type="file" accept=".csv" onChange={handleFileChange} />

//         <div style={{ marginTop: 16 }}>
//           <Button
//             variant="outlined"
//             onClick={handlePreview}
//             disabled={!csvFile}
//             sx={{ mr: 2 }}
//           >
//             Preview CSV
//           </Button>

//           <Button
//             variant="contained"
//             onClick={handleBulkUpload}
//             disabled={!previewDone || hasErrors}
//           >
//             Upload CSV
//           </Button>
//         </div>

//         <Button sx={{ mt: 2 }} variant="text" onClick={handleDownloadTemplate}>
//           Download CSV Template
//         </Button>

//         {/* ----------- Preview Table ----------- */}
//         {previewData.length > 0 && (
//           <Table sx={{ mt: 3 }}>
//             <TableHead>
//               <TableRow>
//                 <TableCell>Row</TableCell>
//                 <TableCell>Status</TableCell>
//                 <TableCell>Message</TableCell>
//               </TableRow>
//             </TableHead>
//             <TableBody>
//               {previewData.map((r, i) => (
//                 <TableRow key={i}>
//                   <TableCell>{i + 1}</TableCell>
//                   <TableCell>{r.valid ? "OK" : "ERROR"}</TableCell>
//                   <TableCell>
//                     {r.errors && r.errors.length > 0
//                       ? r.errors.join(", ")
//                       : "-"}
//                   </TableCell>
//                 </TableRow>
//               ))}
//             </TableBody>
//           </Table>
//         )}
//       </Paper>

//       {/* ----------- Dialog ----------- */}
//       <Dialog
//         open={alertDialog.open}
//         onClose={() => setAlertDialog({ ...alertDialog, open: false })}
//       >
//         <DialogTitle sx={{ textAlign: "center" }}>
//           {alertDialog.severity === "success" ? (
//             <CheckCircleIcon color="success" sx={{ fontSize: 60 }} />
//           ) : (
//             <ErrorIcon color="error" sx={{ fontSize: 60 }} />
//           )}
//         </DialogTitle>
//         <DialogContent>
//           <Typography textAlign="center">{alertDialog.message}</Typography>
//         </DialogContent>
//         <DialogActions sx={{ justifyContent: "center" }}>
//           <Button
//             onClick={() => setAlertDialog({ ...alertDialog, open: false })}
//           >
//             OK
//           </Button>
//         </DialogActions>
//       </Dialog>
//     </Container>
//   );
// };

// export default AddEmployee;
