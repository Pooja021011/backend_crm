import { useNavigate } from "react-router-dom";
import { LeadForm } from "@/components/LeadForm";
import { useLeads } from "@/hooks/useLeads";

const AddSellerLead = () => {
  const navigate = useNavigate();
  const { createLead, isLoading, refreshLeads } = useLeads();

  const handleSubmit = async (data: any) => {
    const result = await createLead(data);
    if (result) {
      // Refresh leads list to update badge counts
      await refreshLeads();
      navigate('/leads');
    }
  };

  const handleCancel = () => {
    navigate('/leads');
  };

  return (
    <LeadForm
      type="SELLER"
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isLoading={isLoading}
    />
  );
};

export default AddSellerLead;