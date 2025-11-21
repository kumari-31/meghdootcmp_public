import React, { useState } from "react";
import { Grid2, Card, CardContent, Typography, CardActions, Button, TextField, MenuItem, Select, FormControl, InputLabel, styled, Box } from "@mui/material";
import { Memory, Storage, SettingsEthernet, CheckCircleOutline, DescriptionOutlined } from '@mui/icons-material';
import { lighten } from '@mui/material/styles';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';

const pricingData = [
    {
        title: "Basic Plan",
        ram: "4GB",
        vcpu: 2,
        storage: "50GB",
        os: "Ubuntu 20.04",
        price: 7.30,
        description: "Basic VM for small tasks.",
    },
    {
        title: "Standard Plan",
        ram: "8GB",
        vcpu: 4,
        storage: "100GB",
        os: "Boss 10",
        price: 15.50,
        description: "Standard VM for medium tasks.",
    },
    {
        title: "Advanced Plan",
        ram: "16GB",
        vcpu: 8,
        storage: "200GB",
        os: "Windows Server 2019",
        price: 32.20,
        description: "Advanced VM for heavy tasks.",
    },
    {
        title: "Professional Plan",
        ram: "32GB",
        vcpu: 16,
        storage: "500GB",
        os: "Red Hat Enterprise Linux",
        price: 65.50,
        description: "Professional VM for enterprise-level tasks.",
    },
    {
        title: "Premium",
        ram: "64GB",
        vcpu: 16,
        storage: "1TB",
        os: "Windows",
        price: 410.10,
        description: "Professional VM for premium tasks.",
    },
    {
        title: "Pro",
        ram: "32GB",
        vcpu: 16,
        storage: "500GB",
        os: "Debian",
        price: 165,
        description: "Professional VM for test tasks.",
    },
    {
        title: "Plus",
        ram: "32GB",
        vcpu: 16,
        storage: "500GB",
        os: "Boss 9",
        price: 123.20,
        description: "Professional VM for test tasks.",
    },
    {
        title: "Optimize",
        ram: "32GB",
        vcpu: 16,
        storage: "500GB",
        os: "Red Hat Enterprise Linux",
        price: 65.40,
        description: "Professional VM for test tasks.",
    },
];

const StyledCard = styled(Card)(({ theme }) => ({
    minWidth: 275,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    borderRadius: 8,
    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
    '&:hover': {
        transform: 'scale(1.03)',
        boxShadow: '0 8px 18px rgba(0, 0, 0, 0.18)',
    },
    background: theme.palette.mode === 'dark' ? theme.palette.grey[800] : lighten(theme.palette.background.paper, 0.02),
}));

const StyledButton = styled(Button)(({ theme }) => ({
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.common.white,
    borderRadius: 6,
    padding: theme.spacing(0.75, 2),
    fontWeight: 'bold',
    fontSize: '0.9rem',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
    '&:hover': {
        backgroundColor: theme.palette.primary.dark,
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.12)',
    },
}));

const PricePlanPage = () => {

    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("");


    const filteredPlans = pricingData.filter(plan =>
        Object.values(plan).some(value => value.toString().toLowerCase().includes(search.toLowerCase())) &&
        (filter ? plan.ram === filter || plan.vcpu.toString() === filter || plan.storage === filter : true)
    );
    return (
        <Box sx={{ py: 3, px: { xs: 2, md: 4 } }}>
            <Grid2 container spacing={2} mb={2} alignItems="center">
                <Grid2 item xs={12} sm={6}>
                    <TextField
                        fullWidth
                        label="Search Plans"
                        variant="outlined"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        size="small"
                    />
                </Grid2>
                <Grid2 item xs={12} sm={6}>
                    <FormControl fullWidth sx={{ minWidth: 180 }} size="small">
                        <InputLabel id="filter-label">Filter by</InputLabel>
                        <Select
                            labelId="filter-label"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            MenuProps={{ PaperProps: { style: { maxHeight: 200 } } }}
                            size="small"
                        >
                            <MenuItem value="">All</MenuItem>
                            <MenuItem value="2">2 vCPU</MenuItem>
                            <MenuItem value="4">4 vCPU</MenuItem>
                            <MenuItem value="8">8 vCPU</MenuItem>
                            <MenuItem value="16">16 vCPU</MenuItem>
                            <MenuItem value="4GB">4GB RAM</MenuItem>
                            <MenuItem value="8GB">8GB RAM</MenuItem>
                            <MenuItem value="16GB">16GB RAM</MenuItem>
                            <MenuItem value="32GB">32GB RAM</MenuItem>
                            <MenuItem value="64GB">64GB RAM</MenuItem>
                            <MenuItem value="50GB">50GB Storage</MenuItem>
                            <MenuItem value="100GB">100GB Storage</MenuItem>
                            <MenuItem value="200GB">200GB Storage</MenuItem>
                            <MenuItem value="500GB">500GB Storage</MenuItem>
                            <MenuItem value="1TB">1TB Storage</MenuItem>
                        </Select>
                    </FormControl>
                </Grid2>
            </Grid2>
            <Grid2 container spacing={3}>
                {filteredPlans.map((plan, index) => (
                    <Grid2 item xs={12} sm={6} md={4} lg={3} key={index}>
                        <StyledCard>
                            <CardContent sx={{ p: 2 }}>
                                <Typography variant="h6" component="div" gutterBottom fontWeight="bold" color="primary">
                                    {plan.title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.85rem' }}>
                                    <DescriptionOutlined fontSize="small" sx={{ color: 'action.active' }} /> {plan.description}
                                </Typography>
                                <Typography variant="body1" sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.85rem' }}>
                                    <Memory color="primary" fontSize="small" /> <Typography component="span" fontWeight="bold">RAM:</Typography> {plan.ram}
                                </Typography>
                                <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.85rem' }}>
                                    <SettingsEthernet color="primary" fontSize="small" /> <Typography component="span" fontWeight="bold">vCPU:</Typography> {plan.vcpu}
                                </Typography>
                                <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.85rem' }}>
                                    <Storage color="primary" fontSize="small" /> <Typography component="span" fontWeight="bold">Storage:</Typography> {plan.storage}
                                </Typography>
                                <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.85rem' }}>
                                    <CheckCircleOutline color="success" fontSize="small" /> <Typography component="span" fontWeight="bold">OS:</Typography> {plan.os}
                                </Typography>
                                <Typography variant="h6" sx={{ mt: 1, color: "secondary.main", fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '1rem' }}>
                                    <CurrencyRupeeIcon color="secondary" fontSize="small" /> ₹{plan.price} <Typography component="span" fontSize="0.8rem" color="text.secondary">/ hour</Typography>
                                </Typography>
                            </CardContent>
                            <CardActions sx={{ justifyContent: 'center', p: 1 }}>
                                <StyledButton size="small" variant="contained">
                                    Choose
                                </StyledButton>
                            </CardActions>
                        </StyledCard>
                    </Grid2>
                ))}
            </Grid2>
        </Box>
    );
};

export default PricePlanPage;