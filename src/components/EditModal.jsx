// src/components/DescriptionModal.jsx
import PropTypes from 'prop-types';

function EditModal({ isOpen, onClose, onSave, description, label, onDescriptionChange }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay z-5 fixed top-0 left-0 w-100 h-100 bg-black-40 bg-blur flex justify-center align-center">
      <div className="modal-content">
        <h2 className="ma0 mt4 mb3">{`Edit Info Text for ${label}`}</h2>
        <textarea
          className="f5"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={15}
          cols={50}
        />
        <p className="ma0 f5">{`Info text is viewable by clicking on items in 'Player Mode'.`}</p>
        <div className="mt3">
          <button className="mr2 glow-bg ba b--white bw1 br4" onClick={onSave}>Save</button>
          <button className="glow-bg ba b--white bw1 br4" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

EditModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  description: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  onDescriptionChange: PropTypes.func.isRequired,
};

export default EditModal;
