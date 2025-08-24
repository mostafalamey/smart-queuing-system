import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { useAuth } from "@/lib/AuthContext";
import { useAppToast } from "@/hooks/useAppToast";

// Helper function to parse PostgreSQL array format to JavaScript array
const parseDepartmentIds = (
  departmentIdsString: string | string[] | null
): string[] | null => {
  if (!departmentIdsString) return null;

  // If it's already an array, return it as-is
  if (Array.isArray(departmentIdsString)) {
    return departmentIdsString;
  }

  // Handle PostgreSQL array format: {id1,id2,id3} -> ["id1", "id2", "id3"]
  if (
    departmentIdsString.startsWith("{") &&
    departmentIdsString.endsWith("}")
  ) {
    const content = departmentIdsString.slice(1, -1); // Remove { }
    return content ? content.split(",").map((id) => id.trim()) : [];
  }

  // Handle comma-separated format: "id1,id2,id3" -> ["id1", "id2", "id3"]
  if (departmentIdsString.includes(",")) {
    return departmentIdsString.split(",").map((id) => id.trim());
  }

  // Handle single ID: "id1" -> ["id1"]
  return departmentIdsString ? [departmentIdsString.trim()] : [];
};

import {
  Organization,
  Member,
  Branch,
  Department,
  OrganizationForm,
  QRCodeData,
} from "./types";

export const useOrganizationData = () => {
  const { userProfile } = useAuth();
  const { showSuccess, showError, showWarning, showInfo } = useAppToast();

  // State
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [branchQrCodes, setBranchQrCodes] = useState<QRCodeData>({});
  const [departmentQrCodes, setDepartmentQrCodes] = useState<QRCodeData>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [qrGenerating, setQrGenerating] = useState(false);

  const [orgForm, setOrgForm] = useState<OrganizationForm>({
    name: "",
    contact_email: "",
    phone: "",
    website: "",
    address: "",
    primary_color: "#3b82f6",
    welcome_message: "",
    logo_url: "",
    country: "Egypt",
    country_code: "+20",
  });

  // Fetch functions
  const fetchOrganization = useCallback(async () => {
    if (!userProfile?.organization_id) return;

    const { data } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", userProfile.organization_id)
      .single();

    if (data) {
      setOrganization(data);
      setOrgForm({
        name: data.name || "",
        contact_email: data.contact_email || "",
        phone: data.phone || "",
        website: data.website || "",
        address: data.address || "",
        primary_color: data.primary_color || "#3b82f6",
        welcome_message: data.welcome_message || "",
        logo_url: data.logo_url || "",
        country: data.country || "Egypt",
        country_code: data.country_code || "+20",
      });

      // Generate organization QR code inline
      if (data.name && !qrGenerating) {
        try {
          setQrGenerating(true);
          const response = await fetch("/api/generate-qr", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              organizationId: userProfile.organization_id,
              organizationName: data.name,
            }),
          });

          const qrData = await response.json();
          if (qrData.success) {
            setQrCodeUrl(qrData.qrCodeDataURL);
          }
        } catch (error) {
          logger.error("Error generating organization QR code:", error);
        } finally {
          setQrGenerating(false);
        }
      }
    }
  }, [userProfile?.organization_id]);

  const fetchMembers = useCallback(async () => {
    if (!userProfile?.organization_id) return;

    const { data } = await supabase
      .from("members")
      .select(
        `
        *,
        organizations(*)
      `
      )
      .eq("organization_id", userProfile.organization_id);

    // Parse department_ids from PostgreSQL array format to JavaScript array
    const parsedMembers = (data || []).map((member) => ({
      ...member,
      department_ids: member.department_ids
        ? parseDepartmentIds(member.department_ids)
        : null,
    }));

    setMembers(parsedMembers);
  }, [userProfile?.organization_id]);

  const fetchBranches = useCallback(async () => {
    if (!userProfile?.organization_id) return;

    const { data } = await supabase
      .from("branches")
      .select("*")
      .eq("organization_id", userProfile.organization_id)
      .order("name");

    setBranches(data || []);

    // Generate QR codes for each branch (like original version)
    if (data && data.length > 0 && organization?.name) {
      const qrCodes: QRCodeData = {};
      for (const branch of data) {
        try {
          const response = await fetch("/api/generate-qr", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              organizationId: userProfile.organization_id,
              branchId: branch.id,
              organizationName: organization.name,
            }),
          });

          const qrData = await response.json();
          if (qrData.success) {
            qrCodes[branch.id] = qrData.qrCodeDataURL;
          }
        } catch (error) {
          logger.error("Error generating branch QR code:", error);
        }
      }
      setBranchQrCodes(qrCodes);
    }
  }, [userProfile?.organization_id, organization?.name]);

  const generateQRCode = async () => {
    if (!userProfile?.organization_id || !organization?.name || qrGenerating) {
      return;
    }

    setQrGenerating(true);

    try {
      const response = await fetch("/api/generate-qr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId: userProfile.organization_id,
          organizationName: organization.name,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setQrCodeUrl(data.qrCodeDataURL);
      }
    } catch (error) {
      logger.error("Error generating organization QR code:", error);
    } finally {
      setQrGenerating(false);
    }
  };

  // QR Code Action Functions
  const downloadQR = () => {
    const link = document.createElement("a");
    link.download = `${organization?.name || "organization"}-qr-code.png`;
    link.href = qrCodeUrl;
    link.click();
  };

  const copyQRUrl = async () => {
    if (!userProfile?.organization_id) return;

    const customerUrl =
      process.env.NEXT_PUBLIC_CUSTOMER_URL || "http://localhost:3002";
    const url = `${customerUrl}?org=${userProfile.organization_id}`;
    await navigator.clipboard.writeText(url);

    showSuccess(
      "URL Copied!",
      "Customer queue URL has been copied to your clipboard.",
      {
        label: "Test URL",
        onClick: () => window.open(url, "_blank"),
      }
    );
  };

  const printQR = () => {
    if (!qrCodeUrl) {
      showError(
        "Print Failed",
        "QR code not available. Please generate it first."
      );
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showError(
        "Print Failed",
        "Unable to open print window. Please check your browser settings."
      );
      return;
    }

    const customerUrl =
      process.env.NEXT_PUBLIC_CUSTOMER_URL || "http://localhost:3002";
    const url = `${customerUrl}?org=${userProfile?.organization_id}`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Organization QR Code - ${organization?.name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 20px;
              margin: 0;
            }
            .qr-container {
              max-width: 400px;
              margin: 0 auto;
              padding: 20px;
              border: 2px solid #e5e7eb;
              border-radius: 8px;
            }
            .org-name {
              font-size: 28px;
              font-weight: bold;
              color: #1f2937;
              margin-bottom: 20px;
            }
            .subtitle {
              font-size: 18px;
              color: #374151;
              margin-bottom: 20px;
            }
            .qr-code {
              margin: 20px 0;
              border: 1px solid #d1d5db;
              border-radius: 4px;
            }
            .instructions {
              font-size: 16px;
              color: #6b7280;
              margin-top: 20px;
              line-height: 1.5;
            }
            .url {
              font-size: 12px;
              color: #9ca3af;
              word-break: break-all;
              margin-top: 15px;
              padding: 10px;
              background: #f9fafb;
              border-radius: 4px;
            }
            @media print {
              body { margin: 0; }
              .qr-container { border: 2px solid #000; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            ${
              organization?.logo_url
                ? `<img src="${organization.logo_url}" alt="Logo" style="max-width: 100px; margin-bottom: 20px;" />`
                : ""
            }
            <div class="org-name">${organization?.name || "Organization"}</div>
            <div class="subtitle">General Access Queue</div>
            <img src="${qrCodeUrl}" alt="Organization QR Code" class="qr-code" />
            <div class="instructions">
              Scan this QR code with your phone to join the general queue
            </div>
            <div class="url">${url}</div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    // Wait for image to load before printing
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 1000);

    showSuccess(
      "Print Dialog Opened!",
      "Organization QR code is ready for printing."
    );
  };

  const downloadBranchQR = (branchId: string, branchName: string) => {
    const qrCode = branchQrCodes[branchId];
    if (!qrCode) {
      showError(
        "Download Failed",
        "QR code not available. Please generate it first."
      );
      return;
    }

    const link = document.createElement("a");
    link.download = `${branchName}-qr-code.png`;
    link.href = qrCode;
    link.click();

    showSuccess(
      "QR Code Downloaded!",
      `${branchName} QR code has been saved to your device.`
    );
  };

  const copyBranchQRUrl = async (branchId: string, branchName?: string) => {
    if (!userProfile?.organization_id) return;

    try {
      const customerUrl =
        process.env.NEXT_PUBLIC_CUSTOMER_URL || "http://localhost:3002";
      const url = `${customerUrl}?org=${userProfile.organization_id}&branch=${branchId}`;
      await navigator.clipboard.writeText(url);

      showSuccess(
        "Branch URL Copied!",
        `${
          branchName || "Branch"
        } queue URL has been copied to your clipboard.`,
        {
          label: "Try URL",
          onClick: () => window.open(url, "_blank"),
        }
      );
    } catch (error) {
      showError("Copy Failed", "Unable to copy URL to clipboard.");
    }
  };

  const printBranchQR = (branchId: string, branchName: string) => {
    const qrCode = branchQrCodes[branchId];
    if (!qrCode) {
      showError(
        "Print Failed",
        "QR code not available. Please generate it first."
      );
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showError(
        "Print Failed",
        "Unable to open print window. Please check your browser settings."
      );
      return;
    }

    const customerUrl =
      process.env.NEXT_PUBLIC_CUSTOMER_URL || "http://localhost:3002";
    const url = `${customerUrl}?org=${userProfile?.organization_id}&branch=${branchId}`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${branchName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 20px;
              margin: 0;
            }
            .qr-container {
              max-width: 400px;
              margin: 0 auto;
              padding: 20px;
              border: 2px solid #e5e7eb;
              border-radius: 8px;
            }
            .org-name {
              font-size: 24px;
              font-weight: bold;
              color: #1f2937;
              margin-bottom: 10px;
            }
            .branch-name {
              font-size: 20px;
              color: #374151;
              margin-bottom: 20px;
            }
            .qr-code {
              margin: 20px 0;
              border: 1px solid #d1d5db;
              border-radius: 4px;
            }
            .instructions {
              font-size: 16px;
              color: #6b7280;
              margin-top: 20px;
              line-height: 1.5;
            }
            .url {
              font-size: 12px;
              color: #9ca3af;
              word-break: break-all;
              margin-top: 15px;
              padding: 10px;
              background: #f9fafb;
              border-radius: 4px;
            }
            @media print {
              body { margin: 0; }
              .qr-container { border: 2px solid #000; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="org-name">${organization?.name || "Organization"}</div>
            <div class="branch-name">${branchName} Branch</div>
            <img src="${qrCode}" alt="QR Code for ${branchName}" class="qr-code" />
            <div class="instructions">
              Scan this QR code with your phone to join the queue at ${branchName}
            </div>
            <div class="url">${url}</div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    // Wait for image to load before printing
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 1000);

    showSuccess(
      "Print Dialog Opened!",
      `${branchName} QR code is ready for printing.`
    );
  };

  const downloadDepartmentQR = (
    departmentId: string,
    departmentName: string
  ) => {
    const qrCode = departmentQrCodes[departmentId];
    if (!qrCode) {
      showError(
        "Download Failed",
        "QR code not available. Please generate it first."
      );
      return;
    }

    const link = document.createElement("a");
    link.download = `${departmentName}-qr-code.png`;
    link.href = qrCode;
    link.click();

    showSuccess(
      "QR Code Downloaded!",
      `${departmentName} QR code has been saved to your device.`
    );
  };

  const copyDepartmentQRUrl = async (
    departmentId: string,
    departmentName?: string,
    branchId?: string
  ) => {
    if (!userProfile?.organization_id) return;

    try {
      const customerUrl =
        process.env.NEXT_PUBLIC_CUSTOMER_URL || "http://localhost:3002";
      const url = `${customerUrl}?org=${userProfile.organization_id}&branch=${branchId}&department=${departmentId}`;
      await navigator.clipboard.writeText(url);

      showSuccess(
        "Department URL Copied!",
        `${
          departmentName || "Department"
        } queue URL has been copied to your clipboard.`,
        {
          label: "Try URL",
          onClick: () => window.open(url, "_blank"),
        }
      );
    } catch (error) {
      showError("Copy Failed", "Unable to copy URL to clipboard.");
    }
  };

  const printDepartmentQR = (
    departmentId: string,
    departmentName: string,
    branchId: string
  ) => {
    const qrCode = departmentQrCodes[departmentId];
    if (!qrCode) {
      showError(
        "Print Failed",
        "QR code not available. Please generate it first."
      );
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showError(
        "Print Failed",
        "Unable to open print window. Please check your browser settings."
      );
      return;
    }

    const customerUrl =
      process.env.NEXT_PUBLIC_CUSTOMER_URL || "http://localhost:3002";
    const url = `${customerUrl}?org=${userProfile?.organization_id}&branch=${branchId}&department=${departmentId}`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Department QR Code - ${departmentName}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 20px;
              background: white;
            }
            .qr-container {
              max-width: 400px;
              margin: 0 auto;
              padding: 20px;
              border: 2px solid #333;
            }
            .logo { max-width: 100px; margin-bottom: 20px; }
            h1 { color: #333; margin-bottom: 10px; font-size: 24px; }
            h2 { color: #666; margin-bottom: 20px; font-size: 18px; }
            .qr-code { margin: 20px 0; }
            .instructions { 
              margin-top: 20px; 
              font-size: 14px; 
              color: #666;
              line-height: 1.4;
            }
            .url { 
              font-size: 10px; 
              color: #999; 
              word-break: break-all; 
              margin-top: 10px;
              padding: 10px;
              background: #f5f5f5;
            }
            @media print {
              body { margin: 0; }
              .qr-container { border: 1px solid #333; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            ${
              organization?.logo_url
                ? `<img src="${organization.logo_url}" alt="Logo" class="logo" />`
                : ""
            }
            <h1>${organization?.name || "Organization"}</h1>
            <h2>${departmentName} Department</h2>
            <div class="qr-code">
              <img src="${qrCode}" alt="Department QR Code" style="max-width: 250px;" />
            </div>
            <div class="instructions">
              <strong>How to Join the Queue:</strong><br>
              1. Scan this QR code with your phone<br>
              2. Enter your phone number<br>
              3. Get your queue ticket instantly<br>
              4. Receive SMS updates on your turn
            </div>
            <div class="url">${url}</div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);

    showInfo(
      "Print Dialog Opened",
      `${departmentName} department QR code is ready to print.`
    );
  };

  const fetchDepartments = useCallback(async () => {
    if (!userProfile?.organization_id) return;

    const { data } = await supabase
      .from("departments")
      .select(
        `
        *,
        branches:branch_id (
          id,
          name
        )
      `
      )
      .order("name");

    // Filter departments that belong to branches of this organization
    const { data: orgBranches } = await supabase
      .from("branches")
      .select("id")
      .eq("organization_id", userProfile.organization_id);

    const orgBranchIds = orgBranches?.map((b) => b.id) || [];
    const orgDepartments =
      data?.filter((dept) => orgBranchIds.includes(dept.branch_id)) || [];

    setDepartments(orgDepartments);

    // Generate QR codes for each department (like original version)
    if (orgDepartments && orgDepartments.length > 0 && organization?.name) {
      const qrCodes: QRCodeData = {};
      for (const department of orgDepartments) {
        try {
          const response = await fetch("/api/generate-qr", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              organizationId: userProfile.organization_id,
              branchId: department.branch_id,
              departmentId: department.id,
              organizationName: organization.name,
              departmentName: department.name,
            }),
          });

          const qrData = await response.json();
          if (qrData.success) {
            qrCodes[department.id] = qrData.qrCodeDataURL;
          }
        } catch (error) {
          logger.error("Error generating department QR code:", error);
        }
      }
      setDepartmentQrCodes(qrCodes);
    }
  }, [userProfile?.organization_id, organization?.name]);

  // Effects
  useEffect(() => {
    if (userProfile?.organization_id) {
      fetchOrganization();
      fetchMembers();
    }
  }, [userProfile?.organization_id, fetchOrganization, fetchMembers]);

  // Realtime subscription for members table
  useEffect(() => {
    if (!userProfile?.organization_id) return;

    const channel = supabase
      .channel("members-realtime")
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "members",
          filter: `organization_id=eq.${userProfile.organization_id}`,
        },
        (payload) => {
          console.log("Members table change detected:", payload);

          if (payload.eventType === "INSERT") {
            const newMember = {
              ...payload.new,
              department_ids: payload.new.department_ids
                ? parseDepartmentIds(payload.new.department_ids)
                : null,
            } as Member;

            setMembers((prev) => [...prev, newMember]);
          } else if (payload.eventType === "UPDATE") {
            const updatedMember = {
              ...payload.new,
              department_ids: payload.new.department_ids
                ? parseDepartmentIds(payload.new.department_ids)
                : null,
            } as Member;

            setMembers((prev) =>
              prev.map((member) =>
                member.id === updatedMember.id ? updatedMember : member
              )
            );
          } else if (payload.eventType === "DELETE") {
            setMembers((prev) =>
              prev.filter((member) => member.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile?.organization_id]);

  // Separate effect for branches and departments that depends on organization being loaded
  useEffect(() => {
    if (userProfile?.organization_id && organization?.name) {
      fetchBranches();
      fetchDepartments();
    }
  }, [
    userProfile?.organization_id,
    organization?.name,
    fetchBranches,
    fetchDepartments,
  ]);

  return {
    // State
    organization,
    setOrganization,
    members,
    setMembers,
    branches,
    setBranches,
    departments,
    setDepartments,
    qrCodeUrl,
    setQrCodeUrl,
    branchQrCodes,
    setBranchQrCodes,
    departmentQrCodes,
    setDepartmentQrCodes,
    loading,
    setLoading,
    uploading,
    setUploading,
    qrGenerating,
    setQrGenerating,
    orgForm,
    setOrgForm,

    // Functions
    fetchOrganization,
    fetchMembers,
    fetchBranches,
    fetchDepartments,
    generateQRCode,

    // QR Code Action Functions
    downloadQR,
    copyQRUrl,
    printQR,
    downloadBranchQR,
    copyBranchQRUrl,
    printBranchQR,
    downloadDepartmentQR,
    copyDepartmentQRUrl,
    printDepartmentQR,

    // Toast functions
    showSuccess,
    showError,
    showWarning,
    showInfo,

    // Auth
    userProfile,
  };
};
